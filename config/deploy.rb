default_run_options[:pty] = true

set :application, "paperless-graphiti"
set :deploy_to, "/var/app/paperless-graphiti"
set :deploy_via, :remote_cache
set :scm, :git
set :repository, "git@github.com:paperlesspost/paperless-graphiti.git"
set :user, "paperless"
set :use_sudo, false

namespace :deploy do
  task :migrate do
    puts "    not doing migrate because not a Rails application."
  end
  task :finalize_update do
    puts "    not doing finalize_update because not a Rails application."
  end
  task :start do
    puts "    not doing start because not a Rails application."
  end
  task :stop do 
    puts "    not doing stop because not a Rails application."
  end
  task :restart do
    puts "    not doing restart because not a Rails application."
  end
end

task :production do
  role :app, 'graphiti.pp.local', :primary => true
end
