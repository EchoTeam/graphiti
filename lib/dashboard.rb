require 'pony'

class Dashboard
  include Redised

  def self.save(slug = nil, json)
    slug ||= json[:slug]
    slug = "#{Time.now.to_f}".delete('.') if slug.nil? || slug.empty?
    json[:slug] = slug
    key = "dashboards:#{slug}"
    redis.hset key, "title", json[:title]
    redis.hset key, "slug", slug
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
    slugs ||= []
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

  def self.snapshot_graphs(slug)
    dashboard = find(slug, true)
    snapshots = []
    if dashboard
      dashboard['graphs'].each do |graph|
        url = Graph.snapshot(graph['uuid'])
        snapshots << [graph['title'], url] if url
      end
    end
    snapshots
  end

  def self.send_report(slug)
    dashboard = find(slug, true)
    if dashboard
      graphs = snapshot_graphs(slug)
      return false if graphs.empty?
      timestamp = Time.now.strftime "%a %b %d %I:%M%p"
      haml = Haml::Engine.new(File.read(File.join(File.dirname(__FILE__), '..', 'views', 'report.haml')))
      html = haml.render(Object.new, :dashboard => dashboard, :time => timestamp, :graphs => graphs)
      email = Graphiti.settings.reports.dup
      email['subject'] = "Graphiti Report for #{dashboard['title']} #{timestamp}"
      email['to'] = email['to'].gsub(/SLUG/, slug)
      email['via'] = email['via'].to_sym
      email['via_options'] = email['via_options'].symbolize_keys! if email['via_options']
      email['html_body'] = html
      email.symbolize_keys!
      Pony.mail(email)
    end
  end

  def self.send_reports
    Dashboard.all.each do |dashboard|
      send_report(dashboard['slug'])
    end
  end

end
