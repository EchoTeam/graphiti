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
    Graph.redis = settings.redis_url
    Dashboard.redis = settings.redis_url
  end

  get '/graphs/:uuid.js' do
    json Graph.find(params[:uuid])
  end

  get '/metrics' do
    json :metrics => Graph.metrics(params[:refresh])
  end

  get '/graphs.js' do
    json :graphs => Graph.all
  end

  get '/dashboards/:slug.js' do
    json Dashboard.find(params[:slug])
  end

  get '/dashboards.js' do
    json :dashboards => Dashboard.all
  end

  post '/graphs' do
    uuid = Graph.save(params[:graph])
    json :uuid => uuid
  end

  put '/graphs/:uuid' do
    uuid = Graph.save(params[:uuid], params[:graph])
    json :uuid => uuid
  end

  post '/dashboards' do
    dashboard = Dashboard.save(params[:dashboard])
    json :dashboard => dashboard
  end

  post '/graphs/dashboards' do
    json :graphs => Dashboard.add_graph(params[:dashboard], params[:uuid])
  end

  get '/graphs/new' do
    haml :index
  end

  get '/graphs/:uuid' do
    haml :index
  end

  get '/graphs' do
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
