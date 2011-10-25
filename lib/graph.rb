class Graph
  include Redised

  def self.metrics(refresh = false)
    redis_metrics = redis.get("metrics")
    @metrics = redis_metrics.split("\n") if redis_metrics
    return @metrics if @metrics && !@metrics.empty? && !refresh
    get_metrics_list
    redis.set "metrics", @metrics.join("\n")
    @metrics
  end

  def self.save(uuid = nil, graph_json)
    uuid ||= UUID.generate(:compact)[0..10]
    redis.hset "graphs:#{uuid}", "title", graph_json[:title]
    redis.hset "graphs:#{uuid}", "json", graph_json[:json]
    redis.hset "graphs:#{uuid}", "updated_at", Time.now.to_i
    redis.hset "graphs:#{uuid}", "url", graph_json[:url]
    redis.zadd "graphs", Time.now.to_i, uuid
    uuid
  end

  def self.find(uuid)
    h = redis.hgetall "graphs:#{uuid}"
    h['uuid'] = uuid
    h['snapshots'] = redis.smembers "graphs:#{uuid}:snapshots"
    h
  rescue
    nil
  end

  def self.snapshot(uuid)
    snapshot = Snapshot.new(uuid)
    filename = snapshot.get_graph_file
    redis.sadd "graphs:#{uuid}:snapshots", filename
    filename
  end

  def self.all(*graph_ids)
    graph_ids = redis.zrevrange "graphs", 0, -1 if graph_ids.empty?
    graph_ids.flatten.collect do |uuid|
      find(uuid)
    end.compact
  end

  private
  def self.get_metrics_list(prefix = "stats.")
    url = "http://#{Graphiti.settings.graphite_host}/metrics/find?query=#{prefix}&format=completer"
    response = Typhoeus::Request.get(url)
    if response.success?
      json = Yajl::Parser.parse(response.body)
      json["metrics"].each do |metric|
        if metric["is_leaf"] == "1"
          @metrics ||= []
          @metrics << metric["path"]
        else
          get_metrics_list(metric["path"])
        end
      end
    else
      puts "Error fetching #{url}. #{response.inspect}"
    end
    @metrics.sort
  end
end
