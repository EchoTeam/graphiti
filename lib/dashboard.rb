class Dashboard
  include Redised

  def self.save(slug = nil, json)
    slug ||= json[:slug]
    key = "dashboards:#{slug}"
    redis.hset key, "title", json[:title]
    redis.hset key, "slug", json[:slug]
    redis.hset key, "updated_at", Time.now.to_i
    redis.zadd "dashboards", Time.now.to_f * 1000, slug
    redis.sadd "graphs:dashboards", slug
    json
  end

  def self.find(slug, with_graphs = false)
    dash = redis.hgetall "dashboards:#{slug}"
    return nil if !dash || dash.empty?
    if with_graphs
      dash['graphs'] = graphs(slug)
    else
      dash['graphs'] = graph_ids(slug)
    end
    dash
  end

  def self.all(*slugs)
    slugs = redis.zrevrange "dashboards", 0, -1 if slugs.empty?
    slugs.flatten.collect do |slug|
      find(slug)
    end.compact
  end

  def self.destroy(slug)
    key = "dashboards:#{slug}"
    redis.del key
    redis.zrem "dashboards", slug
    redis.srem "graphs:dashboards", slug
  end

  def self.add_graph(slug, uuid)
    redis.zadd "dashboards:#{slug}:graphs", Time.now.to_f * 1000, uuid
    redis.sadd "graphs:#{uuid}:dashboards", slug
    redis.hset "dashboards:#{slug}", "updated_at", Time.now.to_i
    redis.zadd "dashboards", Time.now.to_f * 1000, slug
    {uuid: uuid, slug: slug}
  end

  def self.remove_graph(slug, uuid)
    redis.zrem "dashboards:#{slug}:graphs", uuid
    redis.srem "graphs:#{uuid}:dashboards", slug
  end

  def self.graph_ids(slug)
    redis.zrange "dashboards:#{slug}:graphs", 0, -1
  end

  def self.graphs(slug)
    ids = graph_ids(slug)
    ids.empty? ? [] : Graph.all(*ids)
  end

  def self.with_graph(uuid)
    all(redis.smembers("graphs:#{uuid}:dashboards"))
  end

  def self.without_graph(uuid)
    if redis.scard("graphs:dashboards") > 0
      all(redis.sdiff("graphs:dashboards", "graphs:#{uuid}:dashboards"))
    else
      all
    end
  end

end
