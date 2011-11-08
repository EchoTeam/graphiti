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
    h['snapshots'] = redis.smembers "graphs:#{uuid}:snapshots"
    h
  rescue
    nil
  end

  def self.snapshot(uuid)
    graph = find(uuid)
    return nil if !graph
    url, params = graph['url'].split('?', 2)
    url = url + '?' + Rack::Utils.escape(params)
    puts url
    response = Typhoeus::Request.get(url)
    if response.success?
      graph_data = response.body
      filename = "/#{uuid}/#{Time.now.to_i}.png"
      if S3::Request.upload(filename, StringIO.new(graph_data), 'image/png')
        redis.sadd "graphs:#{uuid}:snapshots", filename
        filename
      end
    end
    false
  end

  def self.dashboards(uuid)
    redis.smembers("graphs:#{uuid}:dashboards")
  end

  def self.destroy(uuid)
    redis.del "graphs:#{uuid}"
    redis.zrem "graphs", uuid
    self.dashboards(uuid).each do |dashboard|
      Dashboard.remove_graph dashboard, uuid
    end
  end

  def self.all(*graph_ids)
    graph_ids = redis.zrevrange "graphs", 0, -1 if graph_ids.empty?
    graph_ids.flatten.collect do |uuid|
      find(uuid)
    end.compact
  end

end
