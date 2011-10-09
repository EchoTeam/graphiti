# Redised allows for the common patter of module access to redis, when included
# a .redis and .redis= method are provided
# Ganked from resque
module Redised

  def self.redis_connection(params)
    @redis_connections ||= {}
    @redis_connections[params] ||= Redis.new(params)
  end

  def self.included(klass)

    klass.module_eval do
      # Accepts:
      #   1. A 'hostname:port' string
      #   2. A 'hostname:port:db' string (to select the Redis db)
      #   3. A 'hostname:port/namespace' string (to set the Redis namespace)
      #   4. A redis URL string 'redis://host:port'
      #   5. An instance of `Redis`, `Redis::Client`, `Redis::DistRedis`,
      #      or `Redis::Namespace`.
      def self.redis=(server)
        if server.respond_to? :split

          if server =~ /redis\:\/\//
            conn = ::Redised.redis_connection(:url => server)
          else
            server, namespace = server.split('/', 2)
            host, port, db = server.split(':')
            conn = ::Redised.redis_connection(:host => host, :port => port,
                              :thread_safe => true, :db => db)
          end
          namespace ||= :resque

          @redis = Redis::Namespace.new(namespace, :redis => conn)
        elsif server.respond_to? :namespace=
          @redis = server
        else
          @redis = Redis::Namespace.new(:resque, :redis => server)
        end
      end

      # Returns the current Redis connection. If none has been created, will
      # create a new one.
      def self.redis
        return @redis if @redis
      rescue NoMethodError => e
        raise("There was a problem setting up your redis for redis_namespace #{redis_namespace}: #{e}")
      end
    end

  end

end
