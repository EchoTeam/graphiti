$:.unshift(File.expand_path('./lib', ENV['rvm_path']))
require 'rvm/capistrano'

set :application, "graphiti"
set :deploy_to, "/var/sites/graphiti"
set :deploy_via, :remote_cache
set :scm, :git
set :repository, "git@github.com:paperlesspost/graphiti.git"
set :user, "paperless"
set :use_sudo, false
set :normalize_asset_timestamps, false
set :rvm_ruby_string, 'default'
set :rvm_bin_path, '/usr/local/bin'

set :unicorn_binary, "/usr/local/rvm/gems/ruby-1.9.2-p0/bin/unicorn"
set :unicorn_config, "#{current_path}/config/unicorn.rb"
set :unicorn_pid, "#{current_path}/tmp/pids/unicorn.pid"

namespace :deploy do
  task :start, :roles => :app, :except => { :no_release => true } do
    run "cd #{current_path} && bundle exec #{unicorn_binary} -c #{unicorn_config} -E production -D"
  end
  task :stop, :roles => :app, :except => { :no_release => true } do
    run "kill `cat #{unicorn_pid}`"
  end
  task :graceful_stop, :roles => :app, :except => { :no_release => true } do
    run "kill -s QUIT `cat #{unicorn_pid}`"
  end
  task :reload, :roles => :app, :except => { :no_release => true } do
    run "kill -s USR2 `cat #{unicorn_pid}`"
  end
  task :restart, :roles => :app, :except => { :no_release => true } do
    stop
    start
  end
end

task :production do
  server 'graphiti.pp.local', :web, :app, :db, :primary => true,
end

namespace :graphiti do
  task :link_configs do
    run "cd #{release_path} && rm config/settings.yml && ln -nfs #{shared_path}/config/settings.yml #{release_path}/config/settings.yml"
    run "cd #{release_path} && ln -nfs #{shared_path}/amazon_s3.yml #{release_path}/config/amazon_s3.yml"
  end

  task :compress do
    run "cd #{release_path} && bundle exec jim compress"
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
after "deploy:update_code", "graphiti:compress"
