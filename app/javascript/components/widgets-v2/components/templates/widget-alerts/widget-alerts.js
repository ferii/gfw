import { connect } from 'react-redux';

import * as actions from 'components/widgets-v2/actions';
import Component from './component';
console.log(actions, 'accas');
export default connect(null, actions)(Component);
