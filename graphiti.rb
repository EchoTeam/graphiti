require 'rubygems'
require 'bundler'
Bundler.setup

if !defined?(RACK_ENV)
  RACK_ENV = ENV['RACK_ENV'] || 'development'
end

require 'sinatra/base'
require 'sinatra/contrib'
require 'redis/namespace'
require 'compass'
require 'typhoeus'
require 'yajl'
require 'digest/sha1'

require './lib/s3/request'
require './lib/s3/signature'
require './lib/redised'

require './lib/metric'
require './lib/graph'
require './lib/dashboard'

class Graphiti < Sinatra::Base

  VERSION = '0.1.0'

  register Sinatra::Contrib

  config_file 'config/settings.yml'

  configure do
    set :logging, true
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
    Metric.redis = settings.redis_url
  end

  use Rack::Auth::Basic, "graphiti" do |username, password|
    [username, password] == ['jskit', 'rules!']
  end

  before do
    S3::Request.logger = logger
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

  post '/graphs/:uuid/snapshot' do
    url = Graph.snapshot(params[:uuid])
    json :url => url
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
    json Dashboard.add_graph(params[:dashboard], params[:uuid])
  end

  delete '/graphs/dashboards' do
    json Dashboard.remove_graph(params[:dashboard], params[:uuid])
  end

  delete '/graphs/:uuid' do
    Graph.destroy(params[:uuid])
  end

  delete '/dashboards/:slug' do
    Dashboard.destroy(params[:slug])
  end

  post '/snapshot' do
    filename = Graph.snapshot(params[:uuid])
    json :filename => filename
  end

  # Routes that are entirely handled by Sammy/frontend
  # and just need to load the empty index
  %w{
    /graphs/workspace
    /graphs/new
    /graphs/:uuid
    /graphs/:uuid/snapshots
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
    response['Expires'] = (Time.now + 60*60*24*356*3).httpdate
    scss :"stylesheets/#{params[:name]}"
  end

  def default_graph
    {
      :options => settings.default_options,
      :targets => settings.default_metrics.collect {|m| [m, {}] }
    }
  end

end
# vim: set ts=2 sts=2 sw=2 et:
