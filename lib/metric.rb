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
