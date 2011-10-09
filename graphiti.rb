require 'rubygems'
require 'bundler'
Bundler.setup

require 'sinatra/base'
require 'sinatra/contrib'
require 'redis/namespace'
require 'compass'
require 'typhoeus'
require 'yajl'
require './lib/redised'

class Graph
  include Redised

  def self.metrics(refresh = false)
    redis_metrics = redis.get("metrics")
    @metrics = redis_metrics.split("\n") if redis_metrics
    return @metrics if @metrics && !@metrics.empty? && !refresh
    get_metrics_list
    redis.set "metrics", @metrics.join("\n")
    @metrics
  end

  private
  def self.get_metrics_list(prefix = "stats.")
    url = "http://#{Graphiti.settings.graphite_host}/metrics/find?query=#{prefix}&format=completer"
    response = Typhoeus::Request.get(url)
    if response.success?
      json = Yajl::Parser.parse(response.body)
      json["metrics"].each do |metric|
        if metric["is_leaf"] == "1"
          @metrics ||= []
          @metrics << metric["path"]
        else
          get_metrics_list(metric["path"])
        end
      end
    else
      puts "Error fetching #{url}. #{response.inspect}"
    end
    @metrics
  end
end


class Graphiti < Sinatra::Base

  VERSION = '0.0.1'

  register Sinatra::Contrib

  config_file 'settings.yml'

  configure do
    Compass.configuration do |config|
      config.project_path = settings.root
      config.sass_dir = File.join(settings.views, 'stylesheets')
      config.output_style = :compact
    end
    set :haml, :format => :html5
    set :scss, Compass.sass_engine_options
    Graph.redis = settings.redis_url
  end

  get '/' do
    haml :index
  end

  get '/graphs/new' do
    haml :index
  end

  get '/metrics' do
    json :metrics => Graph.metrics
  end

  get '/stylesheets/:name.css' do
    content_type 'text/css'
    scss :"stylesheets/#{params[:name]}"
  end

  private

end
