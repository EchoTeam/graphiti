require 'base64'

module S3
  # Our own lightweight S3 uploader that uses typhoeus to make the requests internally
  class Request < Struct.new(:host, :method, :path, :headers, :body, :content_type)
    CREDENTIALS = YAML.load_file(File.join(::Graphiti.root, 'config', 'amazon_s3.yml'))
    GRAPHITI_ENV = Graphiti.environment.to_s

    DEFAULTS = {
      :headers => {},
      :method => :put,
      :content_type => 'application/octet-stream'
    }.freeze

    # S3::Request instances hold the temporary data needed for building the
    # request authorization from S3::Signature
    #
    # Using a neat initialization trick for structs from http://www.ruby-forum.com/topic/168962
    def initialize(h)
      h = DEFAULTS.merge(h)
      super *h.values_at(*self.class.members.map {|s| s.to_sym })
    end

    # Sets up the headers needed for making a request given the existing request object.
    # This includes creating the Authorization header and other defaults we have.
    #
    # @param [Hash] options additional options for creating the headers
    # @option options [Hash] :headers additional headers in name => value format
    # @option options [String] :acl Access Control for request (default 'public-read')
    def setup_headers(options = {})
      headers = {
       'cache-control' => "max-age=#{12.months.to_i}, public"
      }.merge(options[:headers] || {})
      headers['x-amz-acl'] = options[:acl] || 'public-read'
      headers["date"] = Time.now.httpdate

      if body && !body.empty?
        headers["content-type"] = content_type
        headers["content-md5"] = Base64.encode64(Digest::MD5.digest(body)).chomp
      end

      self.headers = self.headers.merge(headers)
      self.headers["authorization"] = ::S3::Signature.generate(:host => self.host,
                                                    :request => self,
                                                    :access_key_id => CREDENTIALS[GRAPHITI_ENV]['access_key_id'],
                                                    :secret_access_key => CREDENTIALS[GRAPHITI_ENV]['secret_access_key'])
    end

    # The full URL of the request resource
    def url
      self.class.url(path)
    end

    # Runs the request object through Typhoeus
    #
    # @return [Boolean] true if the request is successful
    def run
      logger.info "-- S3::Request #{method} #{url}"
      response = Typhoeus::Request.send(method, url, :body => body, :headers => headers)
      if GRAPHITI_ENV == 'test' && !response.mock
        warn "Actually making a request to s3 in a test - you probably dont want to do that"
      end
      logger.info "-- S3::Request Response success? #{response.success?} response:\n\n#{response.inspect}\n\n"
      if response.success?
        return true
      elsif response.timed_out?
        reason = "timed out"
      elsif response.code == 0
        reason = "Got a 0 response code: " + response.curl_error_message
      else
        reason = "HTTP request failed: " + response.code.to_s
      end
      logger.error "Request to upload #{url} failed: #{reason}"
      false
    end

    # An alias to the logger
    def logger
      self.class.logger
    end

    class << self
      # Simplest way to upload a file to S3.
      #
      # @param [String] to resource path on s3 (e.g. "/photos/myphoto.jpg")
      # @param [File, String] file the local path or a File object of the file to upload
      # @param [String] content_type the mime type of the file (e.g "image/jpeg")
      # @param [Hash] headers additional headers to pass to the request
      #
      # @return [Boolean] true if the request succeeds
      def upload(to, file, content_type, headers = {})
        file = File.read(file) if file.is_a?(String)

        request = new(host: host, method: :put, path: to, body: file, content_type: content_type)
        request.setup_headers(headers: headers)
        request.run
      end

      # Copy an asset from one path to another on s3 without actually downloading the content.
      # Uses the copy directive: {http://docs.amazonwebservices.com/AmazonS3/latest/API/index.html?RESTObjectCOPY.html}
      #
      # @param [String] from the resource on s3 to copy
      # @param [String] to the new path on s3
      # @param [String] content_type the mime type to store the file as
      # @param [Hash] headers additional headers to pass to the request
      #
      # @return [Boolean] true if the request succeeds
      def copy(from, to, content_type, headers = {})
        return if from == to
        headers['x-amz-copy-source'] = "/#{default_bucket}#{from}"

        request = new(host: host, method: :put, path: to, body: '', content_type: content_type)
        request.setup_headers(headers: headers)
        request.run
      end

      # Alias to the debug logger
      def logger
        DEBUG_LOGGER
      end

      # s3 hostname including the bucket
      def host(bucket = default_bucket)
        "#{bucket}.s3.amazonaws.com"
      end

      # full url for a resource including a the bucket and path
      def url(bucket = default_bucket, resource)
        "http://#{host(bucket)}#{resource}"
      end

      # the bucket pulled from the CREDENTIALS (aka the `amazon_s3.yml`
      # config file)
      def default_bucket
        CREDENTIALS[GRAPHITI_ENV]['bucket']
      end

    end

  end
end
