import { createElement, PureComponent } from 'react';
import { connect } from 'react-redux';

import * as modalMetaActions from 'components/modals/meta/meta-actions';
import * as dataAnalysisActions from 'pages/map/components/data-analysis-menu/actions';

import Component from './polygon-analysis-component';

const actions = {
  ...modalMetaActions,
  ...dataAnalysisActions
};

const mapStateToProps = ({ analysis }) => ({
  data: analysis.data
});

class PolygonAnalysisContainer extends PureComponent {
  render() {
    return createElement(Component, {
      ...this.props
    });
  }
}

export default connect(mapStateToProps, actions)(PolygonAnalysisContainer);
