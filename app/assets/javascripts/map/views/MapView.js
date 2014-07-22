/**
 * The MapView class for the Google Map.
 *
 * @return MapView class (extends Backbone.View)
 */
define([
  'backbone',
  'underscore',
  'presenters/MapPresenter',
  'views/maptypes/grayscaleMaptype',
  'views/maptypes/treeheightMaptype',
  'views/AnalysisButtonView',
  'views/AnalysisResultsView',
  'views/layers/UMDLossLayer',
  'views/layers/ForestGainLayer',
  'views/layers/FormaLayer',
  'views/layers/ImazonLayer',
  'views/layers/ModisLayer',
  'views/layers/FiresLayer',
  'views/layers/Forest2000Layer',
  'views/layers/IntactForestLayer',
  'views/layers/PantropicalLayer',
  'views/layers/LoggingLayer',
  'views/layers/MiningLayer',
  'views/layers/OilPalmLayer',
  'views/layers/WoodFiberPlantationsLayer',
  'views/layers/ProtectedAreasLayer',
  'views/layers/BiodiversityHotspotsLayer',
  'views/layers/ResourceRightsLayer',
  'views/layers/UserStoriesLayer',
  'views/layers/MongabayStoriesLayer'
], function(Backbone, _, Presenter, grayscaleMaptype, treeheightMaptype, AnalysisButtonView, AnalysisResultsView,
  UMDLossLayer, ForestGainLayer, FormaLayer, ImazonLayer, ModisLayer, FiresLayer, Forest2000Layer,
  IntactForestLayer, PantropicalLayer, LoggingLayer, MiningLayer, OilPalmLayer, WoodFiberPlantationsLayer,
  ProtectedAreasLayer, BiodiversityHotspotsLayer, ResourceRightsLayer, UserStoriesLayer, MongabayStoriesLayer) {

  'use strict';

  var MapView = Backbone.View.extend({

    el: '#map',

    options: {
      minZoom: 3,
      backgroundColor: '#99b3cc',
      disableDefaultUI: true,
      panControl: false,
      zoomControl: false,
      mapTypeControl: false,
      scaleControl: true,
      streetViewControl: false,
      overviewMapControl: false
    },

    /**
     * Map layer slug with layer views.
     */
    layersViews: {
      umd_tree_loss_gain: UMDLossLayer,
      forestgain: ForestGainLayer,
      forma: FormaLayer,
      imazon: ImazonLayer,
      modis: ModisLayer,
      fires: FiresLayer,
      forest2000: Forest2000Layer,
      intact_forest: IntactForestLayer,
      pantropical: PantropicalLayer,
      logging: LoggingLayer,
      mining: MiningLayer,
      oil_palm: OilPalmLayer,
      wood_fiber_plantations: WoodFiberPlantationsLayer,
      protected_areas: ProtectedAreasLayer,
      biodiversity_hotspots: BiodiversityHotspotsLayer,
      resource_rights: ResourceRightsLayer,
      user_stories: UserStoriesLayer,
      mongabay: MongabayStoriesLayer
    },

    /**
     * Constructs a new MapView and its presenter.
     */
    initialize: function() {
      this.presenter = new Presenter(this);
      this.layerInst = {};
    },

    /**
     * Creates the Google Maps and attaches it to the DOM.
     */
    render: function(params) {
      params = {
        zoom: params.zoom,
        mapTypeId: params.maptype,
        center: new google.maps.LatLng(params.lat, params.lng),
      };

      this.map = new google.maps.Map(this.el, _.extend({}, this.options, params));
      this.resize();
      this._setMaptypes();
      this._setZoomControl();
      this._addCompositeViews();
      this._addListeners();
      this._addLogos();

      google.maps.event.addListenerOnce(this.map, 'idle', _.bind(function() {
        this.$el.addClass('is-loaded');
      }, this));
    },

    /**
     * Adds any default composite views to the map.
     */
    _addCompositeViews: function() {
      this.$el.append(new AnalysisButtonView({map:this.map}).$el);
      this.$el.append(new AnalysisResultsView({map:this.map}).$el);
    },
    /**
    * Adds CartoDB and Google Earth Engine logos to the map.
    *
    * @param {Time} in miliseconds to wait.
    */
    _addLogos: function(mseconds) {
      var self = this;
      setTimeout(function(){
        if (!document.getElementById('cartodb_logo')) {
          var cartodb_link = document.createElement('a');
          cartodb_link.setAttribute('id','cartodb_logo');
          cartodb_link.setAttribute('style','position:absolute; bottom:3px; left:74px; display:block; border:none; z-index:100');
          cartodb_link.setAttribute('href','http://www.cartodb.com');
          cartodb_link.setAttribute('target','_blank');
          cartodb_link.innerHTML = "<img src='http://cartodb.s3.amazonaws.com/static/new_logo.png' alt='CartoDB' title='CartoDB' style='border:none;' />";
          self.map.getDiv().appendChild(cartodb_link)
        }
        if (!document.getElementById('gee_logo')) {
          var gee_link = document.createElement('a');
          gee_link.setAttribute('id','gee_logo');
          gee_link.setAttribute('style','position:absolute; bottom: 0px; left:160px; display:block; border:none; z-index:100');
          gee_link.setAttribute('href','https://earthengine.google.org');
          gee_link.setAttribute('target','_blank');
          gee_link.innerHTML = "<img src='/assets/logos/geengine.png' alt='Powered by Google Earth Engine' title='Powered by Google Earth Engine' style='border:none;' />";
          self.map.getDiv().appendChild(gee_link)
        }
      }, mseconds);
    },

    /**
     * Wires up Google Maps API listeners so that the view can respond to user
     * events fired by the UI.
     */
    _addListeners: function() {
      google.maps.event.addListener(this.map, 'zoom_changed',
        _.bind(function() {
          this.onZoomChange();
        }, this)
      );
      google.maps.event.addListener(this.map, 'dragend',
        _.bind(function() {
          this.onCenterChange();
      }, this));
    },

    initMap: function(params) {
      this.render(params);
    },

    /**
     * Add passed layers to the map and remove the rest.
     *
     * @param {object} layers
     */
    setLayers: function(layers) {
      // Remove layers if needed
      _.each(this.layerInst, _.bind(function(inst, layerSlug) {
          if (!layers[layerSlug]) {
            this._removeLayer(layerSlug);
          }
        }, this));

      /**
       * Sort layers by position before calling.
       * This way layers are going to be rendered always on the right order.
       */
      _.map(_.sortBy(_.values(layers), 'position'),
        this._addLayer, this);
    },

    /**
     * Used by MapView to add a layer to the map.
     *
     * @param {Object} layer The layer object
     */
    _addLayer: function(layer) {
      if (this.layersViews[layer.slug] && !this.layerInst[layer.slug]) {
        var layerView = this.layerInst[layer.slug] =
          new this.layersViews[layer.slug](layer, this.map);

        var position = 0;
        var layersCount = this.map.overlayMapTypes.getLength();

        if (typeof layer.position !== 'undefined' && layer.position <= layersCount) {
          position = layersCount - layer.position;
        }

        layerView.addLayer({position: position});
      }
    },

    /**
     * Used by MapPresenter to remove a layer by layerSlug.
     *
     * @param  {string} layerSlug The layerSlug of the layer to remove
     */
    _removeLayer: function(layerSlug) {
      var inst = this.layerInst[layerSlug];
      if (!inst) {return;}
      inst.removeLayer();
      inst.presenter && inst.presenter.unsubscribe && inst.presenter.unsubscribe();
      this.layerInst[layerSlug] = null;
    },

    updateLayer: function(layerSlug) {
      var layer = this.layerInst[layerSlug].layer;
      this._removeLayer(layerSlug);
      this._addLayer(layer);
    },

    /**
     * Used by MapPresenter to set the map zoom.
     *
     * @param {integer} zoom The map zoom to set
     */
    setZoom: function(zoom) {
      this.map.setZoom(zoom);
    },

    getZoom: function() {
      return this.map.getZoom();
    },

    /**
     * Used by MapPresenter to set the map center.
     *
     * @param {Number} lat The center latitude
     * @param {Number} lng The center longitude
     */
    setCenter: function(lat, lng) {
      this.map.setCenter(new google.maps.LatLng(lat, lng));
    },

    getCenter: function() {
      var center = this.map.getCenter();

      return {lat: center.lat(), lng: center.lng()};
    },

    fitBounds: function(bounds) {
      this.map.fitBounds(bounds);
    },

    /**
     * Used by MapPresenter to set the map type.
     *
     * @param {string} maptype The map type id.
     */
    setMapTypeId: function(maptype) {
      this.map.setMapTypeId(maptype);
    },

    getMapTypeId: function() {
      return this.map.getMapTypeId();
    },

    /**
     * Handles a map zoom change UI event by dispatching to MapPresenter.
     */
    onZoomChange: function() {
      this.presenter.onZoomChange(this.map.zoom);
    },

    /**
     * Handles a map center change UI event by dispatching to MapPresenter.
     */
    onCenterChange: function() {
      var center = this.map.getCenter();
      var lat = center.lat();
      var lng = center.lng();

      this.presenter.onCenterChange(lat, lng);
    },

    /**
     * Resizes the map.
     */
    resize: function() {
      google.maps.event.trigger(this.map, 'resize');
      this.map.setZoom(this.map.getZoom());
      this.map.setCenter(this.map.getCenter());
    },

    /**
     * Set additional maptypes to this.map.
     */
    _setMaptypes: function() {
      this.map.mapTypes.set('grayscale', grayscaleMaptype());
      this.map.mapTypes.set('treeheight', treeheightMaptype());
    },

    _setZoomControl: function() {
      $('.zoom-in').on('click', _.bind(function() {
        this.setZoom(this.getZoom() + 1);
      }, this));
      $('.zoom-out').on('click', _.bind(function() {
        this.setZoom(this.getZoom() - 1);
      }, this));
    }

  });

  return MapView;

});
