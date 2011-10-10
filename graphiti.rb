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
require 'uuid'

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

  def self.save(uuid = nil, graph_json)
    uuid ||= UUID.generate(:compact)[0..10]
    redis.hset "graphs:#{uuid}", "json", graph_json[:json]
    redis.hset "graphs:#{uuid}", "updated_at", Time.now.to_i
    redis.hset "graphs:#{uuid}", "url", graph_json[:url]
    redis.zadd "graphs", Time.now.to_i, uuid
    uuid
  end

  def self.find(uuid)
    redis.hgetall "graphs:#{uuid}"
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
    @metrics.sort
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
    set :method_override, true
    Graph.redis = settings.redis_url
  end

  get '/graphs/:uuid.js' do
    json Graph.find(params[:uuid])
  end

  get '/metrics' do
    json :metrics => Graph.metrics(params[:refresh])
  end

  post '/graphs' do
    uuid = Graph.save(params[:graph])
    json :uuid => uuid
  end

  put '/graphs/:uuid' do
    uuid = Graph.save(params[:uuid], params[:graph])
    json :uuid => uuid
  end

  get '/graphs/new' do
    haml :index
  end

  get '/graphs/:uuid' do
    haml :index
  end

  get '/' do
    haml :index
  end

  get '/stylesheets/:name.css' do
    content_type 'text/css'
    scss :"stylesheets/#{params[:name]}"
  end

end
