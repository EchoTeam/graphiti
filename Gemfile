# A sample Gemfile
source :rubygems

gem 'rake'
gem 'rack', '1.3.5'
gem 'sinatra'
gem 'sinatra-contrib'
gem 'jim'
gem 'closure-compiler'
gem 'redis'
gem 'redised'
gem 'compass'
gem 'haml'
gem 'typhoeus'
gem 'yajl-ruby'
gem 'pony'

group :test do
  gem 'minitest', :require => false
  gem 'minitest-display', :require => false
end

group :development do
  gem 'sinatra-reloader', :require => 'sinatra/reloader'
  gem 'thin'
  gem 'ruby-debug19'
end

group :production do
  gem 'unicorn'
end
