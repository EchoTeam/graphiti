require 'rubygems'
require 'bundler'
Bundler.setup

require 'sinatra/base'
require 'sinatra/contrib'
require 'redis/namespace'
require 'compass'

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
  end

  get '/' do
    haml :index
  end

  get '/stylesheets/:name' do
    content_type 'text/css'
    scss :"stylesheets/#{params[:name]}"
  end

end
