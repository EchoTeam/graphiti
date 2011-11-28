class Graph
  include Redised

  def self.save(uuid = nil, graph_json)
    uuid ||= make_uuid(graph_json)
    redis.hset "graphs:#{uuid}", "title", graph_json[:title]
    redis.hset "graphs:#{uuid}", "json", graph_json[:json]
    redis.hset "graphs:#{uuid}", "updated_at", Time.now.to_i
    redis.hset "graphs:#{uuid}", "url", graph_json[:url]
    redis.zadd "graphs", Time.now.to_i, uuid
    uuid
  end

  def self.find(uuid)
    h = redis.hgetall "graphs:#{uuid}"
    h['uuid']      = uuid
    h['snapshots'] = redis.zrange "graphs:#{uuid}:snapshots", 0, -1
    h
  rescue
    nil
  end

  def self.snapshot(uuid)
    graph = find(uuid)
    return nil if !graph
    url = graph['url'].gsub(/\#.*$/,'')
    response = Typhoeus::Request.get(url, :timeout => 20000)
    return false if !response.success?
    graph_data = response.body
    time = (Time.now.to_f * 1000).to_i
    filename = "/snapshots/#{uuid}/#{time}.png"
    return false if !S3::Request.upload(filename, StringIO.new(graph_data), 'image/png')
    image_url = S3::Request.url(filename)
    redis.zadd "graphs:#{uuid}:snapshots", time, image_url
    image_url
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

  def self.make_uuid(graph_json)
    Digest::SHA1.hexdigest(graph_json.inspect + Time.now.to_f.to_s + rand(100).to_s)[0..10]
  end

end
