require 'helper'

class TestDashboard < MiniTest::Unit::TestCase

  def setup
    Dashboard.redis.flushall
    @dash_json = {slug: "newdash", title: "New Dash"}
    @graph_json = {
      title: 'New Graph',
      json: %{{
        "options": {
        "width": 800,
        "height": 400,
        "from": "-7d",
        "fontSize": 10,
        "title": "New Graph",
        "targets": [],
        "font": "DroidSans",
        "thickness": 2,
        "bgcolor": "#FFFFFF",
        "fgcolor": "#333333",
        "majorGridLineColor": "#ADADAD",
        "minorGridLineColor": "#E5E5E5"
      },
      "targets": [
        [
          "stats.timers.production.rails.controller.total.mean",
          {}
        ]
      ]
      }},
      url: "http://graphite01.pp.local/render/?width=800&height=400&from=-7d&fontSize=10&title=New%20Graph&targets=&font=DroidSans&thickness=2&bgcolor=%23FFFFFF&fgcolor=%23333333&majorGridLineColor=%23ADADAD&minorGridLineColor=%23E5E5E5&target=stats.timers.production.rails.controller.total.mean&_timestamp_=1320820805352#.png"
    }
    assert @graph_uuid = Graph.save(@graph_json)
    puts @graph_uuid
  end

  def test_saving_dashboard
    dash = Dashboard.save(@dash_json)
    assert dash
    assert_equal @dash_json, dash
  end

  def test_find_dashboard_with_graphs
    assert Dashboard.save(@dash_json)
    dash = Dashboard.find(@dash_json[:slug], true)
    assert Dashboard.add_graph(@dash_json[:slug], @graph_uuid)
    assert dash
    assert_kind_of Hash, dash
    assert dash['updated_at']
    assert_equal @dash_json[:title], dash['title']
    assert dash['graphs']
    assert_kind_of Array, dash['graphs']
    assert_kind_of Hash, dash['graphs'][0]
    assert_equal 1, dash['graphs'].length
    assert_equal @graph_json['title'], dash['graphs'][0]['title']
  end

  def test_find_dashboard_without_graphs

  end

  def test_all_dashboards

  end

  def test_destroy_dashboards

  end

  def test_add_graph

  end

  def test_remove_graph

  end

  def test_graphs

  end

end
