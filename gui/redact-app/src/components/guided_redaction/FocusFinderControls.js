import React from 'react';
import ScannerSearchControls from './ScannerSearchControls'
import {getFileAndDirNameFromUrl} from './redact_utils.js'
import {
  buildAttributesAddRow, buildLabelAndTextInput, buildLabelAndDropdown,
  buildMatchIdField,
  buildInlinePrimaryButton, 
  buildTier1LoadButton, 
  buildTier1DeleteButton,
  makeHeaderRow,
  buildAttributesAsRows,
  buildIdString,
  clearTier1Matches,
  buildClearMatchesButton,
  buildRunButton,
  doTier1Save,
} from './SharedControls'


class FocusFinderControls extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      id: '',
      name: '',
      track_cursor: false,
      track_cv2_contours: true,
      debug: true,
      ocr_job_id: '',
      attributes: {},
      scan_level: 'tier_1',
      attribute_search_name: '',
      attribute_search_value: '',
    }
    this.setLocalStateVar=this.setLocalStateVar.bind(this)
    this.getFocusFinderFromState=this.getFocusFinderFromState.bind(this)
  }

  toggleLocalVar(var_name) {
    this.setLocalStateVar(var_name, !this.state[var_name])
  }

  buildToggleField(field_name, label) {
    let checked_val = ''
    if (this.state[field_name]) {
      checked_val = 'checked'
    }
    return (
      <div className='ml-2'>
        <div className='d-inline'>
          <input
            className='mr-2'
            checked={checked_val}
            type='checkbox'
            onChange={() => this.toggleLocalVar(field_name)}
          />
        </div>
        <div className='d-inline'>
          {label}
        </div>
      </div>
    )
  }

  componentDidMount() {
    this.loadNewFocusFinder()
//    this.props.addInsightsCallback('getDataSifterShowType', this.getShowType)
  }

  setLocalStateVar(var_name, var_value, when_done=(()=>{})) {
    if (typeof var_name === 'string' || var_name instanceof String) {
      function anon_func() {
        this.doSave()
        when_done()
      }
      // we have been given one key and one value
      if (this.state[var_name] === var_value) {
        when_done()
      } else {
        this.setState(
          {
            [var_name]: var_value,
          },
          anon_func
        )
      }
    } else {
      // var_name is actually a dict, second argument could be a callback
      let the_callback = (()=>{})
      if (typeof(var_value) === 'function') {
        the_callback = var_value
      }
      function anon_func() {
        this.doSave()
        the_callback()
      }
      this.setState(
        var_name,
        anon_func
      )
    }
  }

  buildLoadButton() {                                                           
    return buildTier1LoadButton(
      'focus_finder',
      this.props.tier_1_scanners['focus_finder'],
      ((value)=>{this.loadFocusFinder(value)})
    )
  }

  loadFocusFinder(the_id) {
    if (!the_id) {
      this.loadNewFocusFinder()
    } else {
      const s = this.props.tier_1_scanners['focus_finder'][the_id]
      this.setState({
        id: s['id'],
        name: s['name'],
        debug: s['debug'],
        track_cursor: s['track_cursor'],
        track_cv2_contours: s['track_cv2_contours'],
        ocr_job_id: s['ocr_job_id'],
        attributes: s['attributes'],
        scan_level: s['scan_level'],
      })
    }
    this.props.current_ids['t1_scanner']['focus_finder'] = the_id
    this.props.displayInsightsMessage('Focus Finder has been loaded')
  }

  loadNewFocusFinder() {
    let deepCopyIds = JSON.parse(JSON.stringify(this.props.current_ids))
    deepCopyIds['t1_scanner']['focus_finder'] = ''
    this.props.setGlobalStateVar('current_ids', deepCopyIds)
    const the_id = 'focus_finder_' + Math.floor(Math.random(1000000, 9999999)*1000000000).toString()

    this.setState({
      id: the_id,
      name: '',
      debug: true,
      track_cursor: false,
      track_cv2_contours: true,
      ocr_job_id: '',
      attributes: {},
      scan_level: 'tier_1',
    })
  }

  getFocusFinderFromState() {
    const focus_finder = {                                                          
      id: this.state.id,
      name: this.state.name,
      debug: this.state.debug,
      track_cursor: this.state.track_cursor,
      track_cv2_contours: this.state.track_cv2_contours,
      ocr_job_id: this.state.ocr_job_id,
      attributes: this.state.attributes,
      scan_level: this.state.scan_level,
    }
    return focus_finder
  }

  doSave(when_done=(()=>{})) {
    doTier1Save(
      'focus_finder',
      this.getFocusFinderFromState,
      this.props.displayInsightsMessage,
      this.props.tier_1_scanners,
      this.props.current_ids,
      this.props.setGlobalStateVar,
      when_done
    )
  }

  async doSaveToDatabase() {
    this.doSave(((focus_finder) => {
      this.props.saveScannerToDatabase(
        'focus_finder',
        focus_finder,
        (()=>{this.props.displayInsightsMessage('Focus Finder has been saved to database')})
      )
    }))
  }

  buildNameField() {
    return buildLabelAndTextInput(
      this.state.name,
      'Name',
      'focus_finder_name',
      'name',
      25,
      ((value)=>{this.setLocalStateVar('name', value)})
    )
  }

  setAttribute(name, value) {
    let deepCopyAttributes = JSON.parse(JSON.stringify(this.state.attributes))
    deepCopyAttributes[name] = value
    this.setState(
      {
        attributes: deepCopyAttributes,
      },
      this.doSave
    )
    this.props.displayInsightsMessage('Attribute was added')
  }

  doAddAttribute() {
    const value_ele = document.getElementById('focus_finder_attribute_value')
    const name_ele = document.getElementById('focus_finder_attribute_name')
    if (value_ele.value && name_ele.value) {
      this.setAttribute(name_ele.value, value_ele.value)
      name_ele.value = ''
      value_ele.value = ''
    }
  }

  deleteAttribute(name) {
    let deepCopyAttributes = JSON.parse(JSON.stringify(this.state.attributes))
    if (!Object.keys(this.state.attributes).includes(name)) {
      return
    }
    delete deepCopyAttributes[name]
      this.setState(
      {
        attributes: deepCopyAttributes,
      },
      this.doSave
    )
    this.props.displayInsightsMessage('Attribute was deleted')
  }

  buildAttributesList() {
    const add_attr_row = buildAttributesAddRow(
      'focus_finder_attribute_name',
      'focus_finder_attribute_value',
      (()=>{this.doAddAttribute()})
    )
    const attribs_list = buildAttributesAsRows(
      this.state.attributes,
      ((value)=>{this.deleteAttribute(value)})
    )
    return (
      <div>
        {add_attr_row}
        {attribs_list}
      </div>
    )
  }

  buildSaveToDatabaseButton() {
    return buildInlinePrimaryButton(
      'Save to DB',
      (()=>{this.doSaveToDatabase()})
    )
  }

  buildRunButtonWrapper() {
    if (!Object.keys(this.props.tier_1_scanners['focus_finder']).includes(this.state.id)) {
      return
    }
    return buildRunButton(
      this.props.tier_1_scanners, 'focus_finder', this.props.buildTier1RunOptions, this.props.submitInsightsJob
    )
  }

  buildDeleteButton() {
    return buildTier1DeleteButton(
      'focus_finder',
      this.props.tier_1_scanners['focus_finder'],
      ((value)=>{this.deleteFocusFinder(value)})
    )
  }

  deleteFocusFinder(the_id) {
    delete this.props.tier_1_scanners['focus_finder'][the_id]
    if (the_id === this.props.current_ids['t1_scanner']['focus_finder']) {
      this.props.current_ids['t1_scanner']['focus_finder'] = ''
    }
    this.props.displayInsightsMessage('Focus Finder was deleted')
  }

  clearMatches(scope) {
    return clearTier1Matches(
      'focus_finder',
      this.props.tier_1_matches,
      this.props.current_ids['t1_scanner']['focus_finder'],
      this.props.movie_url,
      ((a,b)=>{this.props.setGlobalStateVar(a,b)}),
      ((a)=>{this.props.displayInsightsMessage(a)}),
      scope
    )
  }

  buildClearMatchesButton2() {
    const match_keys = Object.keys(this.props.tier_1_matches['focus_finder'])
    if (match_keys.length === 0) {
      return
    }
    return buildClearMatchesButton(
      'focus_finder',
      ((a)=>{this.clearMatches(a)})
    )
  }

  buildMatchIdField2(job_type, is_required=true) {
    return buildMatchIdField(
        job_type,
        this.props.jobs,
        this.setLocalStateVar,
        this.state[job_type + '_job_id'],
        is_required
    )
  }

  render() {
    if (!this.props.visibilityFlags['focus_finder']) {
      return([])
    }
    const id_string = buildIdString(this.state.id, 'focus_finder', false)
    const name_field = this.buildNameField()
    const track_cursor_checkbox = this.buildToggleField('track_cursor', 'Track cursor position')
    const track_contours_checkbox = this.buildToggleField('track_cv2_contours', 'Track large area changes')
    const debug_checkbox = this.buildToggleField('debug', 'debug')
    const ocr_job_id_dropdown = this.buildMatchIdField2('ocr', false) 
    const attributes_list = this.buildAttributesList()
    const header_row = makeHeaderRow(
      'focus finder',
      'focus_finder_body',
      (() => this.props.toggleShowVisibility('focus_finder'))
    )
    const load_button = this.buildLoadButton()
    const delete_button = this.buildDeleteButton()
    const save_to_db_button = this.buildSaveToDatabaseButton()
    const clear_matches_button = this.buildClearMatchesButton2()
    const run_button = this.buildRunButtonWrapper()

    return (
        <div className='row bg-light rounded mt-3'>
          <div className='col'>

            {header_row}

            <div 
                id='focus_finder_body' 
                className='row collapse bg-light'
            >
              <div id='focus_finder_main' className='col'>
                <div className='row mt-2'>
                  {load_button}
                  {delete_button}
                  {save_to_db_button}
                  {clear_matches_button}
                  {run_button}
                </div>

                <div className='row mt-1 mr-1 ml-1 border-top'>
                  {id_string}
                </div>

                <div className='row mt-1 mr-1 ml-1'>
                  {name_field}
                </div>

                <div className='row mt-1 mr-1 ml-1'>
                  {track_cursor_checkbox}
                </div>

                <div className='row mt-1 mr-1 ml-1'>
                  {track_contours_checkbox}
                </div>

                <div className='row mt-1 mr-1 ml-1'>
                  {debug_checkbox}
                </div>

                <div className='row mt-1 mr-1 ml-1'>
                  <div className='row mt-2'>
                    {ocr_job_id_dropdown}
                  </div>

                  {attributes_list}
                </div>

                <div className='row mt-3 ml-1 mr-1'>
                  <ScannerSearchControls
                    search_attribute_name_id='focus_finder_database_search_attribute_name'
                    search_attribute_value_id='focus_finder_database_search_attribute_value'
                    getScanners={this.props.getScanners}
                    importScanner={this.props.importScanner}
                    deleteScanner={this.props.deleteScanner}
                    scanners={this.props.scanners}
                    displayInsightsMessage={this.props.displayInsightsMessage}
                    search_type='focus_finder'
                  />
                </div>

              </div>
            </div>
          </div>
        </div>
    )
  }
}

export default FocusFinderControls;