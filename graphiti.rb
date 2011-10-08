class Graphiti < Sinatra::Base

  VERSION = '0.0.1'

  configure do |c|
    register Sinatra::ConfigFile
    register Sinatra::Compass

    config_file 'settings.yml'
    env_specific = "#{c.environment}.settings.yml"
    if File.readable?(env_specific)
     config_file env_specific
    end
  end

  get '/' do
    haml :index
  end

end
