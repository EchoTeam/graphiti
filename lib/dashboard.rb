class Dashboard
  include Redised

  def self.save(slug = nil, json)
    slug ||= json[:slug]
    key = "dashboards:#{slug}"
    redis.hset key, "title", json[:title]
    redis.hset key, "slug", json[:slug]
    redis.hset key, "updated_at", Time.now.to_i
    redis.zadd "dashboards", Time.now.to_i, slug
    json
  end

  def self.find(slug)
    redis.hgetall "dashboards:#{slug}"
  rescue
    nil
  end

  def self.all
    slugs = redis.zrevrange "dashboards", 0, -1
    slugs.collect do |slug|
      find(slug)
    end.compact
  end

end
