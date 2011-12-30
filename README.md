# Graphiti

Graphiti is an alternate JavaScript and Ruby front-end and graph storage application for the Graphite Real-time graphing engine.

![Graphiti](http://quirkey.com/skitch/http__aq.iriscouch.com_swinger_aq-mdd_graphiti1.jpg-20111211-135528.jpg)

## What 

Graphiti allows you to easily access and manipulate the data you've collected in graphite in a couple of key ways. The focus is on ease of access, ease of recovery and ease of tweaking/manipulation:

* *Graphs* - the basic building blocks of graphiti. Graphs are stored as JSON blobs in Redis. They are created/edited through an editor pane where you live edit the JSON and see a reference of your collected metrics and the display options available. Each graph is given a UUID and can be updated or cloned.
* *Dashboards* - graphs are grouped into arbitrary dashboards which are just named collections with a URL slug for easy reference and retreival. We use dashboards to name personal lists (like "aq"/"mrb") or lists of related information ("key metrics"/"resque"/"rails").
* *Snapshots* - point in time freezeframes of your graphs. This arose when we realized that it would be useful to have access to our graphs from outside of our VPN if we needed to, and that we wanted to be able to refer to specific graphs in campfire logs.
* *Auth-less* - No authentication is considered a feature of Graphiti. It's behind your VPN, your trusted engineers have access to it, and it's easy enough to recreate graphs (and make redis backups, for that matter), that we don't see the point of logins.

## Background

This application is meant to replace the web application that ships with Graphite. While it's great for getting introduced to the wonders of Graphite graphs, it left a lot to be desired for us, both in terms of style and functionality.

We started talking to some smart people that were using Graphite in their own ways, and realized that the underlying API for graph access is pretty great. We started dreaming big for ways to generate graph links, came up with something useful right away, and hammered at it a bit. Aman (@tmm1) shared some Graph generation code they we're using at Github and we built an interface and toolset around it. We think Graphiti can be improved, so we wanted to open source it.

### Reference/Bibliography

* Graphite - http://graphite.wikidot.com/ (Don't be scared by the word ENTERPRISE.)
* Graphite documentation: http://readthedocs.org/docs/graphite/en/1.0/index.html See especially: http://readthedocs.org/docs/graphite/en/1.0/functions.html
* @codahale's Metrics Talk: http://pivotallabs.com/talks/139-metrics-metrics-everywhere 
* @quirkey's talk about metrics @paperlesspost: http://aq.iriscouch.com/swinger/_design/swinger/index.html#/preso/aq-mdd/display/1
* Etsy on Statsd + Graphite: http://codeascraft.etsy.com/2011/02/15/measure-anything-measure-everything/
* Our statsd fork: https://github.com/paperlesspost/statsd
* Github's statsd-ruby fork: https://github.com/github/statsd-ruby

## Technology

Graphiti is a very simple ruby 1.9.2/Sinatra (http://sinatrarb.com) backend that stores the Graph + Dashboard data in Redis (Snapshots are stored in S3). On top of this REST backend is a Sammy.js (http://sammyjs.org) application that handles the graph generation and manipulation. It also uses an embedded version of the Ace (http://ace.ajax.org/) for the editor interface. It uses Jim (http://github.com/quirkey/jim) to bundle and compress the JavaScript. The CSS/SCSS is created with the help of the awesome Compass framework (http://compass-style.org).

### Dependencies

* Ruby 1.9.2
* Bundler (~>1.0)
* Graphite (>=0.9.9) (and your data in graphite. The graphite URL API must be accessible from the same location as Graphiti and through the browser).
* Redis (>2)
* Unicorn
* RubyGems and various Gems (see Gemfile)
* S3 Access (Credentials stored in seperate .yml file)

## Setup/Installation

* Clone the repository
* Make copies of the config/*.yml.example files for s3 and application configuration.
* Bundle: `bundle install`
* Run: `bundle exec unicorn -c config/unicorn.rb -E production -D`
* Generate the metrics list: `bundle exec rake graphiti:metrics` (In order to make searching through your list of metrics fast, Graphiti fetches and caches the full list in Redis. We put this in a rake task that you can run in the background and set up on a cron.)
* A Capfile and `config/deploy.rb` is provided for reference (though it might work for you).

## Credits

Mad peace and shout outs to @tmm1 and the Github crew for very helpful advice and code. 

## Contributing to Graphiti

* Check out the latest master to make sure the feature hasn’t been implemented or the bug hasn’t been fixed yet
* Check out the issue tracker to make sure someone already hasn’t requested it and/or contributed it
* Fork the project
* Start a feature/bugfix branch
* Commit and push until you are happy with your contribution
* Make sure to add tests for it. This is important so I don’t break it in a future version unintentionally.
* Please try not to mess with the Rakefile, version, or history. If you want to have your own version, or is otherwise necessary, that is fine, but please isolate to its own commit so we can cherry-pick around it.

## Copyright

Copyright © 2011 Paperless Post. See LICENSE.md for details.
