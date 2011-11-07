class Graph
  include Redised

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
    h
  rescue
    nil
  end

  def self.all(*graph_ids)
    graph_ids = redis.zrevrange "graphs", 0, -1 if graph_ids.empty?
    graph_ids.flatten.collect do |uuid|
      find(uuid)
    end.compact
  end

end
