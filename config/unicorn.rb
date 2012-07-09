listen 8080 # by default Unicorn listens on port 8080
worker_processes 2 # this should be >= nr_cpus
pid "/var/logs/graphiti/unicorn.pid"
stderr_path "/var/logs/graphiti/unicorn-errors.log"
stdout_path "/var/logs/graphiti/unicorn.log"
