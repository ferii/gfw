import { createSelector, createStructuredSelector } from 'reselect';
import sortBy from 'lodash/sortBy';
import { pluralise } from 'utils/strings';
import uniq from 'lodash/uniq';
import concat from 'lodash/concat';

import colors from 'data/colors.json';
import allOptions from './options';
import allWidgets from './manifest';

export const selectLocation = state => state.location && state.location.payload;
export const selectLocationType = state =>
  state.location && state.location.payload && state.location.payload.type;
export const selectQuery = state => state.location && state.location.query;
export const selectGeostore = state => state.geostore.geostore;
export const selectWidgetsFilter = (state, ownProps) => ownProps.widgets;
export const selectWidgets = state => state.widgetsV2.widgets;
export const selectLoading = state =>
  state.countryData.countriesLoading ||
  state.countryData.regionsLoading ||
  state.countryData.subRegionsLoading ||
  state.whitelists.countriesLoading ||
  state.whitelists.regionsLoading;
export const selectWhitelists = state => ({
  adm0: state.whitelists.countries,
  adm1: state.whitelists.regions
});
export const setectCountryData = state => ({
  adm0: state.countryData.countries,
  adm1: state.countryData.regions,
  adm2: state.countryData.subRegions,
  fao: state.countryData.faoCountries
});

export const getOptions = () => {
  const optionsMeta = {};
  Object.keys(allOptions).forEach(oKey => {
    optionsMeta[oKey] =
      oKey === 'weeks' ? allOptions[oKey] : sortBy(allOptions[oKey], 'label');
  });
  return optionsMeta;
};

export const getIndicator = (forestType, landCategory) => {
  if (!forestType && !landCategory) return null;
  let label = '';
  let value = '';
  if (forestType && landCategory) {
    label = `${forestType.label} in ${landCategory.label}`;
    value = `${forestType.value}__${landCategory.value}`;
  } else if (landCategory) {
    label = landCategory.label;
    value = landCategory.value;
  } else {
    label = forestType.label;
    value = forestType.value;
  }

  return {
    label,
    value
  };
};

export const getActiveWhitelist = createSelector(
  [selectWhitelists, selectLocation],
  (whitelists, location) => whitelists[location.adm1 ? 'adm1' : 'adm0']
);

export const getLocationData = createSelector(
  [selectLocationType, setectCountryData],
  (type, countryData) => {
    if (type === 'country' || type === 'global') return countryData;
    return {};
  }
);

export const getActiveLocationData = createSelector(
  [getLocationData, selectLocation],
  (locationData, location) => {
    if (location.adm2) return locationData.adm2;
    return locationData[location.adm1 ? 'adm1' : 'adm0'];
  }
);

export const getChildLocationData = createSelector(
  [getLocationData, selectLocation],
  (locationData, location) => {
    if (location.adm2) return null;
    return locationData[location.adm1 ? 'adm2' : 'adm1'];
  }
);

export const getLocationObject = createSelector(
  [getActiveLocationData, selectLocation],
  (adms, location) => {
    if (!adms) return null;
    const { adm0, adm1, adm2 } = location;

    return adms.find(a => a.value === (adm2 || adm1 || adm0));
  }
);

export const getLocationName = createSelector(
  [getLocationObject, selectLocationType],
  (location, type) => (location && location.label) || type
);

export const getFAOLocationData = createSelector(
  [setectCountryData],
  countryData => countryData.faoCountries
);

export const getActiveWidget = createSelector(
  [selectQuery],
  query => query && query.widget
);

export const getCategory = createSelector(
  [selectQuery],
  query => query && query.category
);

export const getAdminLevel = createSelector([selectLocation], location => {
  const { type, adm0, adm1, adm2 } = location;
  if (adm2) return 'adm0';
  if (adm1) return 'adm1';
  if (adm0) return 'adm2';
  return type || 'global';
});

export const getAllWidgets = () => Object.values(allWidgets);

export const parseWidgets = createSelector([getAllWidgets], widgets => {
  if (!widgets) return null;

  return widgets.map(w => ({
    widget: w.config.widget,
    Component: w.Component,
    getData: w.getData,
    getProps: w.getProps,
    config: w.config,
    settings: w.settings,
    colors: colors[w.config.colors]
  }));
});

export const filterWidgetFromProps = createSelector(
  [parseWidgets, selectWidgetsFilter],
  (widgets, filter) => {
    if (!filter) return widgets;
    return widgets.filter(w => filter.includes(w.config.slug));
  }
);

export const filterWidgetsByLocation = createSelector(
  [filterWidgetFromProps, selectLocationType, getAdminLevel],
  (widgets, type, adminLevel) => {
    if (!widgets) return null;
    return widgets.filter(w => {
      const { types, admins } = w.config || {};
      return types.includes(type) && admins.includes(adminLevel);
    });
  }
);

export const filterWidgetsByLocationType = createSelector(
  [filterWidgetFromProps, selectLocation, getFAOLocationData],
  (widgets, location, faoCountries) => {
    if (!widgets) return null;
    if (location.type !== 'country') return widgets;
    const isFAOCountry = faoCountries.find(f => f.value === location.adm0);
    return widgets.filter(w => {
      const { source } = w.config || {};
      if (source !== 'fao') return true;
      return isFAOCountry;
    });
  }
);

export const filterWidgetsByLocationWhitelist = createSelector(
  [filterWidgetsByLocation, getAdminLevel, selectLocation],
  (widgets, adminLevel, location) => {
    if (!widgets) return null;
    return widgets.filter(w => {
      const { whitelists } = w.config;
      if (!whitelists) return true;
      const whitelist = whitelists[adminLevel];
      if (!whitelist) return true;
      return whitelist.includes(location[adminLevel]);
    });
  }
);

export const filterWidgetsByIndicatorWhitelist = createSelector(
  [filterWidgetsByLocationWhitelist, getActiveWhitelist],
  (widgets, indicatorWhitelist) => {
    if (!widgets) return null;
    if (!indicatorWhitelist.length) return widgets;
    return widgets.filter(w => {
      const { indicators } = w.config.whitelits || {};
      if (!indicators) return true;
      const totalIndicators = concat(indicators, indicatorWhitelist).length;
      const reducedIndicators = uniq(concat(indicators, indicatorWhitelist))
        .length;
      return totalIndicators !== reducedIndicators;
    });
  }
);

// once we know which widgets we can render, lets pass them all static props
export const parseWidgetsWithOptions = createSelector(
  [filterWidgetsByIndicatorWhitelist, getOptions, getActiveWhitelist],
  (widgets, options, polynameWhitelist) => {
    if (!widgets) return null;

    return widgets.map(w => {
      const optionsConfig = w.config.options;
      const optionKeys = optionsConfig && Object.keys(optionsConfig);
      return {
        ...w,
        ...(optionsConfig && {
          options: optionKeys.reduce((obj, optionKey) => {
            const polynamesOptions = ['forestTypes', 'landCategories'];
            const configWhitelist = optionsConfig[optionKey];
            let filteredOptions = options[optionKey];
            if (Array.isArray(configWhitelist)) {
              filteredOptions = filteredOptions
                ? filteredOptions.filter(o => configWhitelist.includes(o.value))
                : optionsConfig[optionKey].map(o => ({
                  label: o,
                  value: o
                }));
            }
            if (
              polynameWhitelist &&
              polynameWhitelist.length &&
              polynamesOptions.includes(optionKey)
            ) {
              filteredOptions = filteredOptions.filter(o =>
                polynameWhitelist.includes(o.value)
              );
            }
            return {
              ...obj,
              [optionKey]: filteredOptions
            };
          }, {})
        })
      };
    });
  }
);

// now lets pass them their data and settings
export const parseWidgetsWithData = createSelector(
  [parseWidgetsWithOptions, selectWidgets, selectQuery],
  (widgets, widgetsState, query) => {
    if (!widgets) return null;
    return widgets.map(w => {
      const widgetUrlState = (query && query[w.widget]) || {};
      const widgetState = (widgetsState && widgetsState[w.widget]) || {};
      const { options, config } = w;
      const settings = {
        ...w.settings,
        ...widgetUrlState
      };

      return {
        ...w,
        ...widgetState,
        settings,
        ...(options && {
          optionsSelected: Object.keys(settings).reduce((obj, settingsKey) => {
            const optionsKey = pluralise(settingsKey);
            const hasOptions = options[optionsKey];
            return {
              ...obj,
              ...(hasOptions && {
                [settingsKey]: hasOptions.find(
                  o => o.value === settings[settingsKey]
                )
              })
            };
          }, {})
        }),
        ...(config.options.startYear &&
          config.options.endYear && {
            startYears: options.years.filter(y => y.value <= settings.endYear),
            endYears: options.years.filter(y => y.value >= settings.startYear)
          })
      };
    });
  }
);

export const getWidgetsWithIndicator = createSelector(
  [parseWidgetsWithData],
  widgets => {
    if (!widgets) return null;
    return widgets.map(w => {
      const { forestType, landCategory } = w.optionsSelected || {};
      return {
        ...w,
        ...((forestType || landCategory) && {
          indicator: getIndicator(forestType, landCategory)
        })
      };
    });
  }
);

export const getWidgetsWithProps = createSelector(
  [
    getWidgetsWithIndicator,
    selectLocationType,
    selectWhitelists,
    getActiveWhitelist,
    getLocationName,
    getLocationObject
  ],
  (
    widgets,
    type,
    whitelists,
    activeWhitelist,
    locationName,
    locationObject
  ) => {
    if (!widgets) return null;
    return widgets.map(w => ({
      ...w,
      ...w.getProps({
        ...w,
        type,
        activeWhitelist,
        whitelists,
        locationName,
        locationObject
      })
    }));
  }
);

export const getWidgetsProps = createStructuredSelector({
  loading: selectLoading,
  whitelists: selectWhitelists,
  activeWhitelist: getActiveWhitelist,
  activeWidget: getActiveWidget,
  category: getCategory,
  location: selectLocation,
  locationData: getActiveLocationData,
  locationObject: getLocationObject,
  locationName: getLocationName,
  childLocationData: getChildLocationData,
  widgets: getWidgetsWithProps,
  locationType: selectLocationType
});
