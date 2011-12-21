class Metric
  include Redised

  def self.all(refresh = false)
    redis_metrics = redis.get("metrics")
    @metrics = redis_metrics.split("\n") if redis_metrics
    return @metrics if @metrics && !@metrics.empty? && !refresh
    @metrics = []
    get_metrics_list
    redis.set "metrics", @metrics.join("\n")
    @metrics
  end

  def self.find(match, max = 100)
    match = match.to_s.strip
    matches = []
    all.each do |m|
      if m =~ /#{match.strip}/i
        matches << m
      end
      break if matches.length > max
    end
    matches
  end

  private
  def self.get_metrics_list(prefix = Graphiti.settings.metric_prefix)
    url = "http://#{Graphiti.settings.graphite_host}/metrics/index.json"
    puts "Getting #{url}"
    response = Typhoeus::Request.get(url)
    if response.success?
      json = Yajl::Parser.parse(response.body)
      @metrics = json.grep(/^#{Regexp.escape prefix}/)
    else
      puts "Error fetching #{url}. #{response.inspect}"
    end
    @metrics.sort
  end

end
