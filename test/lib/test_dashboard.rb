require 'helper'

class TestDashboard < MiniTest::Unit::TestCase

  def setup
    Dashboard.redis.flushall
  end

  def test_saving_dashboard
    json = {slug: "newdash", title: "New Dash"}
    dash = Dashboard.save(json)
    assert dash
    assert_equal json, dash
  end

  def test_find_dashboard_with_graphs

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
