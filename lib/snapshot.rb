class Snapshot
  def initialize(url)
    @url = url
  end

  def tmp_dir
    Graphiti.settings.tmp_dir
  end

  def get_graph_file
    @filename = Time.now.to_i.to_s + ".jpg"

    @thread = Thread.new{
      if response = Typhoeus::Request.get(@url)
        if file = File.open("#{tmp_dir}/#{@filename}", 'w')
          file << response.body
        end
        file.close
      else
        nil
      end
    }

    @filename
  end
end
