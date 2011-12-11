# Graphiti

Graphiti is an alternate JavaScript and Ruby front-end and graph storage application for the Graphite Real-time graphing engine.

![Graphiti](http://quirkey.com/skitch/http__aq.iriscouch.com_swinger_aq-mdd_graphiti1.jpg-20111211-135528.jpg)

## What 

Graphiti allows you to easily access and manipulate the data you've collected in graphite in a couple of key ways. The focus is on ease of access, ease of recovery and easy of tweaking/manipulation:

* *Graphs* 
* *Dashboards* - collect graphs into 
* *Snapshots*

### Snapshots

Snapshots are point in time freezeframes of your graphs. This arose when we realized that it would be useful to have access to our graphs from outside of our VPN if we needed to, and that we wanted to be able to refer to specific graphs in campfire logs.

### No Authentication

No authentication is considered a feature of Graphiti. It's behind your VPN, your trusted engineers have access to it, and it's easy enough to recreate graphs (and make redis backups, for that matter), that we don't see the point of logins.

## Background

This application is meant to replace the web application that ships with Graphite.  While it's great for getting introduced to the wonders of Graphite graphs, it left a lot to be desired for us, both in terms of style and functionality.

We started talking to some smart people that were using Graphite in their own ways, and realized that the underlying API for graph access is pretty great.  We started dreaming big for ways to generate graph links, came up with something useful right away, and hammered at it a bit.  We think Graphiti can probably be improved, so we wanted to open source it.

If you've stumbled across this application and you don't know what Graphite is, you can check it out [here](http://graphite.wikidot.com/).  Don't be scared by the word ENTERPRISE.  If you've stumbled across this application and you know what Graphite is but you don't know why you should be graphing, please refer to [this](http://pivotallabs.com/talks/139-metrics-metrics-everywhere) and [this](http://aq.iriscouch.com/swinger/_design/swinger/index.html#/preso/aq-mdd/display/1).

## Technology

## Setup/Installation

##

## Dependencies

* Graphite
* Redis
* Unicorn
* Ruby 1.9.2
* RubyGems and various Gems (see Gemfile)
* S3 Access

## Installation

* Clone the repository
* Make copies of the .yml.example files for s3 and application configuration
* `bundle install`
* `cap deploy`

## TODO

* Remove graphiti.pp.local from deploy.rb
* Maybe make Unicorn optional?
* TEEEESSSTTTTSSSS

## Credits

Mad peace and shout outs to @tmm1 and the Github crew for very helpful advice on infrastructure and graph construction code.

## Contributing to Graphiti

* Check out the latest master to make sure the feature hasn’t been implemented or the bug hasn’t been fixed yet

* Check out the issue tracker to make sure someone already hasn’t requested it and/or contributed it

* Fork the project

* Start a feature/bugfix branch

* Commit and push until you are happy with your contribution

* Make sure to add tests for it. This is important so I don’t break it in a future version unintentionally.

* Please try not to mess with the Rakefile, version, or history. If you want to have your own version, or is otherwise necessary, that is fine, but please isolate to its own commit so we can cherry-pick around it.

## Copyright

Copyright © 2011 Paperless Post.  See LICENSE.md for details.
