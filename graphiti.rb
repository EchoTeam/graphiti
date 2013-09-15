require 'rubygems'
require 'bundler/setup'

require 'sinatra/base'
require 'sinatra/contrib'
require 'redis/namespace'
require 'redised'
require 'compass'
require 'yajl'

require './lib/graph'
require './lib/dashboard'

class Graphiti < Sinatra::Base

  VERSION = '0.2.0'

  register Sinatra::Contrib

  config_file 'config/settings.yml'

  configure do
    set :static_cache_control, [:public, {:max_age => 86400}]
    set :logging, true
    set :method_override, true
    Compass.configuration do |config|
      config.project_path = settings.root
      config.sass_dir = File.join(settings.views, 'stylesheets')
      config.output_style = :compact
    end
    set :scss, Compass.sass_engine_options
    set :haml, :format => :html5
    Graph.redis = settings.graphiti['redis_url']
    Dashboard.redis = settings.graphiti['redis_url']
  end

  if settings.graphiti['web_auth'] then
    use Rack::Auth::Basic, settings.graphiti['web_auth']['realm'] do |username, password|
      [username, password] == [settings.graphiti['web_auth']['username'], settings.graphiti['web_auth']['password']]
    end
  end

  get '/graphs/:uuid.js' do
    json Graph.find(params[:uuid])
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
    response['Expires'] = (Time.now + 60*60*24*7).httpdate
    scss :"stylesheets/#{params[:name]}"
  end

  def default_graph
    {
      :graphite_host => settings.graphs['default_graphite_host'],
      :options => settings.graphs['default_options'],
      :targets => settings.graphs['default_metrics'].collect {|m| m.is_a?(Array) ? m : [m, {}] }
    }
  end

end
# vim: set ts=2 sts=2 sw=2 et:
