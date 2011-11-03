require './graphiti'

namespace :graphiti do

  desc 'Rebuild Metrics List'
  task :metrics do
    list = Metric.all true
    puts "Got #{list.length} metrics"
  end

end
