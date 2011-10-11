listen 5001 # by default Unicorn listens on port 8080
worker_processes 2 # this should be >= nr_cpus
pid "/var/sites/graphiti/shared/pids/unicorn.pid"
stderr_path "/var/sites/graphiti/shared/log/unicorn.log"
stdout_path "/var/sites/graphiti/shared/log/unicorn.log"
