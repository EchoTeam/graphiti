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
require './lib/metric'
require './lib/graph'
require './lib/dashboard'
require 'uuid'

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
    set :app_file, __FILE__
    Graph.redis = settings.redis_url
    Dashboard.redis = settings.redis_url
    Metric.redis = settings.redis_url
  end

  get '/graphs/:uuid.js' do
    json Graph.find(params[:uuid])
  end

  get '/metrics.js' do
    json :metrics => Metric.find(params[:q])
  end

  get '/graphs.js' do
    json :graphs => Graph.all
  end

  get '/dashboards/:slug.js' do
    json Dashboard.find(params[:slug], true)
  end

  get '/dashboards.js' do
    if params[:uuid]
      json :dashboards => Dashboard.without_graph(params[:uuid])
    else
      json :dashboards => Dashboard.all
    end
  end

  post '/graphs' do
    uuid = Graph.save(params[:graph])
    json :uuid => uuid
  end

  put '/graphs/:uuid' do
    uuid = Graph.save(params[:uuid], params[:graph])
    json :uuid => uuid
  end

  delete '/graphs/:uuid' do
    Graph.destroy(params[:uuid])
  end

  post '/dashboards' do
    dashboard = Dashboard.save(params[:dashboard])
    json :dashboard => dashboard
  end

  delete '/dashboards/:slug' do
    Dashboard.destroy(params[:slug])
  end

  post '/graphs/dashboards' do
    json Dashboard.add_graph(params[:dashboard], params[:uuid])
  end

  # Routes that are entirely handled by Sammy/frontend
  # and just need to load the empty index
  %w{
    /graphs/workspace
    /graphs/new
    /graphs/:uuid
    /graphs
    /dashboards/:slug
    /dashboards
    /
  }.each do |path|
    get path do
      haml :index
    end
  end

  get '/stylesheets/:name.css' do
    content_type 'text/css'
    scss :"stylesheets/#{params[:name]}"
  end

  def default_graph
    {
      :options => settings.default_options,
      :targets => settings.default_metrics.collect {|m| [m, {}] }
    }
  end

end


require './lib/s3/request'
require './lib/s3/signature'
