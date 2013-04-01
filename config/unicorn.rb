listen 8080 # by default Unicorn listens on port 8080
worker_processes 2 # this should be >= nr_cpus
pid "/var/log/graphiti/unicorn.pid"
stderr_path "/var/log/graphiti/unicorn-errors.log"
stdout_path "/var/log/graphiti/unicorn.log"
