require 'bundler'
Bundler.setup!

require 'sinatra/big_band'

class Graphiti < Sinatra::BigBand

  configure do |c|
    config_file 'settings.yml'
    config_file "#{c.environment}.settings.yml"
  end

  get '/' do
    erb :index
  end

end
