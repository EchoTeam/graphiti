$:.unshift(File.expand_path('./lib', ENV['rvm_path']))
require 'rvm/capistrano'

set :application, "graphiti"
set :deploy_to, "/var/sites/graphiti"
set :deploy_via, :remote_cache
set :scm, :git
set :repository, "git@github.com:paperlesspost/paperless-graphiti.git"
set :user, "paperless"
set :use_sudo, false
set :normalize_asset_timestamps, false
set :rvm_ruby_string, 'default'
set :rvm_bin_path, '/usr/local/bin'

namespace :deploy do
  task :restart do
    run "cd #{current_path} && touch tmp/restart.txt"
  end
end

task :production do
  server 'graphiti.pp.local', :web, :app, :db, :primary => true,
end

namespace :graphiti do
  task :link_configs do
    run "cd #{release_path} && rm settings.yml && ln -nfs #{shared_path}/settings.yml #{release_path}/settings.yml"
  end
end

namespace :bundler do
  desc "Automatically installed your bundled gems if a Gemfile exists"
  task :install_gems, :roles => :web do
    run %{if [ -f #{release_path}/Gemfile ]; then cd #{release_path} &&
      mkdir -p #{release_path}/vendor &&
      ln -nfs #{shared_path}/vendor/bundle #{release_path}/vendor/bundle &&
      bundle install --without test development --deployment; fi
    }
  end
end
after "deploy:update_code", "graphiti:link_configs"
after "deploy:update_code", "bundler:install_gems"
