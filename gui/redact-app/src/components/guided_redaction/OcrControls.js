import React from 'react';
import {
  makeHeaderRow,
  buildLabelAndDropdown,
  buildLabelAndTextInput,
  buildInlinePrimaryButton,
  doTier1Save,
  buildTier1LoadButton,
  buildIdString,
  buildTier1DeleteButton,
  buildClearMatchesButton,
  clearTier1Matches,
  buildAttributesAsRows,
  buildAttributesAddRow,
} from './SharedControls'

class OcrControls extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      id: '',
      name: '',
      match_text: [],
      match_percent: 90,
      skip_east: false,
      scan_level: 'tier_1',
      start_coords: [],
      end_coords: [],
      attributes: {},
      attribute_search_value: '',
      first_click_coords: [],
    }
    this.addOcrZoneCallback=this.addOcrZoneCallback.bind(this)
    this.getOcrMetaFromState=this.getOcrMetaFromState.bind(this)
    this.setLocalStateVar=this.setLocalStateVar.bind(this)
  }

  setLocalStateVar(var_name, var_value, when_done=(()=>{})) {
    this.setState({
      [var_name]: var_value,
      unsaved_changes: true,
    },
    when_done())
  }

  setAttribute(name, value) {
    let deepCopyAttributes = JSON.parse(JSON.stringify(this.state.attributes))
    deepCopyAttributes[name] = value
    this.setState({
      attributes: deepCopyAttributes,
      unsaved_changes: true,
    })
    this.props.displayInsightsMessage('Attribute was added')
  }

  doAddAttribute() {
    const value_ele = document.getElementById('ocr_attribute_value')
    const name_ele = document.getElementById('ocr_attribute_name')
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
    this.setState({
      attributes: deepCopyAttributes,
      unsaved_changes: true,
    })
    this.props.displayInsightsMessage('Attribute was deleted')
  }

  buildAttributesList() {
    const add_attr_row = buildAttributesAddRow(
      'ocr_attribute_name',
      'ocr_attribute_value',
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

  addOcrZoneCallback(end_coords) {
    const start_coords = this.props.clicked_coords
    this.setState({
      start_coords: start_coords,
      end_coords: end_coords,
    })
    this.props.handleSetMode('')
    this.props.displayInsightsMessage('zone was successfully selected')
  }

  buildPickCornersButton() {
    return (
      <button
          key='000'
          className='btn btn-primary'
          onClick={() => this.startOcrRegionAdd() }
      >
        Pick Corners
      </button>
    )
  }

  startOcrRegionAdd() {
    this.props.handleSetMode('scan_ocr_1')
    this.props.addInsightsCallback('scan_ocr_2', this.addOcrZoneCallback)
    this.props.displayInsightsMessage('Select the first corner of the area to scan')
  }

  loadOcrRule(ocr_rule_id) {
    if (!ocr_rule_id) {
      this.loadNewOcrRule()
    } else {
      const ocr_rule = this.props.ocr_rules[ocr_rule_id]
      this.setState({
        id: ocr_rule['id'],
        name: ocr_rule['name'],
        match_text: ocr_rule['match_text'],
        match_percent: ocr_rule['match_percent'],
        skip_east: ocr_rule['skip_east'],
        scan_level: ocr_rule['scan_level'],
        start_coords: ocr_rule['start_coords'],
        end_coords: ocr_rule['end_coords'],
        unsaved_changes: false,
      })
    }
    this.props.setGlobalStateVar('current_ocr_rule_id', ocr_rule_id)
    this.props.displayInsightsMessage('Ocr rule has been loaded')
  }

  loadNewOcrRule() {                                                   
    this.props.setGlobalStateVar('current_ocr_rule_id', '')
    this.setState({
      id: '',
      name: '',
      match_text: [],
      match_percent: 90,
      skip_east: false,
      scan_level: 'tier_1',
      start_coords: [],
      end_coords: [],
      attributes: {},
    })                                                                          
  } 

  getOcrMetaFromState() {
    const ocr_rule = {
      id: this.state.id,
      name: this.state.name,
      start_coords: this.state.start_coords,
      end_coords: this.state.end_coords,
      match_text: this.state.match_text,
      match_percent: this.state.match_percent,
      skip_east: this.state.skip_east,
      scan_level: this.state.scan_level,
      attributes: this.state.attributes,
    }
    return ocr_rule
  }

  buildRunButton() {
//    const tier_1_template_run_options = this.props.buildTier1RunOptions('template', 'ocr_t1_template')
//    const tier_1_selected_area_run_options = this.props.buildTier1RunOptions('selected_area', 'ocr_t1_selected_area')
//    const tier_1_ocr_run_options = this.props.buildTier1RunOptions('ocr', 'ocr_t1_ocr')
//    const tier_1_telemetry_run_options = this.props.buildTier1RunOptions('telemetry', 'ocr_t1_telemetry')
//    const movie_set_run_options = this.props.buildMovieSetOptions('ocr_movie_set')
    const tier_1_template_run_options = ''
    const tier_1_selected_area_run_options = ''
    const tier_1_ocr_run_options = ''
    const tier_1_telemetry_run_options = ''
    const movie_set_run_options = ''
    return (
      <div className='d-inline ml-2'>
        <button
            className='btn btn-primary dropdown-toggle'
            type='button'
            id='runTelemetryDropdownButton'
            data-toggle='dropdown'
            area-haspopup='true'
            area-expanded='false'
        >
          Run
        </button>
        <div className='dropdown-menu' aria-labelledby='RunTelemetryDropdownButton'>
          <button className='dropdown-item'
              onClick={() => this.props.submitInsightsJob('ocr_current_frame')}
          >
            Frame
          </button>
          <button className='dropdown-item'
              onClick={() => this.props.submitInsightsJob('ocr_current_movie')}
          >
            Movie
          </button>
          <button className='dropdown-item'
              onClick={() => this.props.submitInsightsJob('ocr_all_movies')}
          >
            All Movies
          </button>
          {movie_set_run_options}
          {tier_1_template_run_options}
          {tier_1_selected_area_run_options}
          {tier_1_ocr_run_options}
          {tier_1_telemetry_run_options}
        </div>
      </div>
    )
  }

  updateMatchText(rows_as_string) {
    const match_text = rows_as_string.split('\n')
    this.setState({
      match_text: match_text,
    })
  }

  buildMatchText() {
    return (
      <div className='ml-2 mt-2'>
        <div>
          Match On:
        </div>
        <div
            className='d-inline'
        >
          <textarea
             id='match_text'
             cols='60'
             rows='3'
             value={this.state.match_text.join('\n')}
             onChange={(event) => this.updateMatchText(event.target.value)}
          />
        </div>
      </div>
    )
  }

  updateMatchPercent(match_percent) {
    this.setState({
      match_percent: match_percent,
    })
  }

  buildMatchPercent() {
    return (
      <div
        className='d-inline ml-2 mt-2'
      >   
        <div className='d-inline'>
          Match Percent:
        </div>
        <div className='d-inline ml-2'>
          <input 
            id='match_percent'
            size='4'
            value={this.state.match_percent}
            onChange={(event) => this.updateMatchPercent(event.target.value)}
          />
        </div>
      </div>
    )
  }

  toggleSkipEast() {
    const new_value = (!this.state.skip_east)
    this.setState({
      skip_east: new_value,
    })
  }

  buildSkipEast() {
    let checked_state = ''
    if (this.state.skip_east) {
      checked_state = 'checked'
    }
    return (
      <div className='ml-2'>
        <div className='d-inline'>
          Skip East
        </div>
        <div className='d-inline'>
          <input
            className='ml-2 mr-2 mt-1'
            id='toggle_skip_east'
            checked={checked_state}
            type='checkbox'
            onChange={() => this.toggleSkipEast()}
          />
        </div>
      </div>
    )
  }

  buildScanLevel() {
      const scan_level_dropdown = [
      {'tier_1': 'Tier 1 (find only)'},
      {'tier_2': 'Tier 2 (find and redact)'}
    ]

    return buildLabelAndDropdown(
      scan_level_dropdown,
      'Scan Level',
      this.state.scan_level,
      'ocr_scan_level',
      ((value)=>{this.setLocalStateVar('scan_level', value)})
    )
  }

  buildStartEndCoords() {
    if (this.state.start_coords.length === 0 && this.state.end_coords.length === 0) {
      return ''
    }

    return (
      <div className='ml-2'>
        <div>
          <div className='d-inline'>
            start coords:
          </div>
          <div className='d-inline ml-2'>
            [{this.state.start_coords[0]}, {this.state.start_coords[1]}]
          </div>
        </div>
        <div>
          <div className='d-inline'>
            end coords:
          </div>
          <div className='d-inline ml-2'>
            [{this.state.end_coords[0]}, {this.state.end_coords[1]}]
          </div>
        </div>
      </div>
    )
  }

  buildNameField() {
    return buildLabelAndTextInput(
      this.state.name,
      'Name',
      'ocr_name',
      'name',
      25,
      ((value)=>{this.setLocalStateVar('name', value)})
    )
  }

  buildSaveButton() {
    return buildInlinePrimaryButton(
      'Save',
      (()=>{this.doSave()})
    )
  }

  buildSaveToDatabaseButton() {
    return buildInlinePrimaryButton(
      'Save to DB',
      (()=>{this.doSaveToDatabase()})
    )
  }

  doSave(when_done=(()=>{})) {
    doTier1Save(
      'ocr_rule',
      this.state.name,
      this.getOcrMetaFromState,
      this.props.displayInsightsMessage,
      this.props.ocr_rules,
      'ocr_rules',
      'current_ocr_rule_id',
      this.setLocalStateVar,
      this.props.setGlobalStateVar,
      when_done
    )
  }

  async doSaveToDatabase() {
    this.doSave(((ocr_rule) => {
      this.props.saveScannerToDatabase(
        'ocr_rule',
        ocr_rule,
        (()=>{this.props.displayInsightsMessage('Ocr Rule has been saved to database')})
      )
    }))
  }

  buildLoadButton() {
    return buildTier1LoadButton(
      'ocr_rule',
      this.props.ocr_rules,
      ((value)=>{this.loadOcrRule(value)})
    )
  }

  buildDeleteButton() {
    return buildTier1DeleteButton(
      'ocr_rule',
      this.props.ocr_rules,
      ((value)=>{this.deleteOcrRule(value)})
    )
  }

  deleteOcrRule(ocr_rule_id) {
    let deepCopyOcrRules= JSON.parse(JSON.stringify(this.props.ocr_rules))
    delete deepCopyOcrRules[ocr_rule_id]
    this.props.setGlobalStateVar('ocr_rules', deepCopyOcrRules)
    if (ocr_rule_id === this.props.current_ocr_rule_id) {
      this.props.setGlobalStateVar('current_ocr_rule_id', '')
    }
    this.props.displayInsightsMessage('Ocr rule was deleted')
  }

  buildClearMatchesButton2() {                                                  
    return buildClearMatchesButton(                                             
      'ocr',                                                          
      ((a)=>{this.clearOcrRuleMatches(a)})                                 
    )                                                                           
  }                                                                             
      
  clearOcrRuleMatches(scope) {
    return clearTier1Matches(
      'ocr',
      this.props.tier_1_matches,
      this.props.current_ocr_rule_id,
      this.props.movie_url,
      ((a,b)=>{this.props.setGlobalStateVar(a,b)}),
      ((a)=>{this.props.displayInsightsMessage(a)}),
      scope
    )
  }

  render() {
    if (!this.props.visibilityFlags['ocr']) {
      return([])
    }
    const pick_button = this.buildPickCornersButton()
    const id_string = buildIdString(this.state.id, 'ocr rule', this.state.unsaved_changes)
    const run_button = this.buildRunButton()
    const load_button = this.buildLoadButton()
    const save_button = this.buildSaveButton()
    const delete_button = this.buildDeleteButton()
    const save_to_database_button = this.buildSaveToDatabaseButton()
    const clear_matches_button = this.buildClearMatchesButton2()
    const match_text = this.buildMatchText()
    const match_percent = this.buildMatchPercent()
    const skip_east = this.buildSkipEast()
    const scan_level = this.buildScanLevel()
    const start_end_coords = this.buildStartEndCoords()
    const attributes_list = this.buildAttributesList()
    const header_row = makeHeaderRow(
      'ocr',
      'ocr_body',
      (()=>{this.props.toggleShowVisibility('ocr')})
    )
    const name_field = this.buildNameField()

    return (
        <div className='row bg-light rounded mt-3'>
          <div className='col'>

            {header_row}

            <div 
                id='ocr_body' 
                className='row collapse pb-2'
            >
              <div id='ocr_main' className='col'>

                <div className='row bg-light'>
                  {load_button}
                  {delete_button}
                  {save_button}
                  {save_to_database_button}
                  {clear_matches_button}
                  {run_button}
                </div>

                <div className='row mt-2 ml-0 bg-light'>
                  {pick_button}
                </div>

                <div className='row bg-light'>
                  {id_string}
                </div>

                <div className='row bg-light'>
                  {name_field}
                </div>

                <div className='row bg-light'>
                  {match_text}
                </div>

                <div className='row bg-light'>
                  {match_percent}
                </div>

                <div className='row bg-light'>
                  {skip_east}
                </div>

                <div className='row bg-light'>
                  {scan_level}
                </div>

                <div className='row bg-light'>
                  {start_end_coords}
                </div>

                <div className='row mt-1 mr-1 ml-1 border-top'>                 
                  {attributes_list}                                             
                </div>      

              </div>
            </div>

          </div>
        </div>
    )
  }
}

export default OcrControls;
