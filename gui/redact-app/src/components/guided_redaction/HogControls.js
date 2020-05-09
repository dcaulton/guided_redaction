import React from 'react';
import ScannerSearchControls from './ScannerSearchControls'
import {
  makeHeaderRow,
  buildInlinePrimaryButton,
  doTier1Save,
  buildTier1LoadButton,
  buildTier1DeleteButton,
  buildLabelAndTextInput,
  buildIdString,
  buildLabelAndDropdown,
  buildAttributesAddRow,
  buildAttributesAsRows,
} from './SharedControls'

class HogControls extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      id: '',
      name: '',
      attributes: {},
      unsaved_changes: false,
    }
    this.setLocalStateVar=this.setLocalStateVar.bind(this)
    this.getHogRuleFromState=this.getHogRuleFromState.bind(this)
    this.setLocalStateVarNoWarning=this.setLocalStateVarNoWarning.bind(this)
  }

  setLocalStateVar(var_name, var_value, when_done=(()=>{})) {
    this.setState({
      [var_name]: var_value,
      unsaved_changes: true,
    },
    when_done())
  }

  setLocalStateVarNoWarning(var_name, var_value, when_done=(()=>{})) {
    this.setState({
      [var_name]: var_value,
      unsaved_changes: false,
    },
    when_done())
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

  getHogRuleFromState() {
    const hog_rule = {
      id: this.state.id,
      name: this.state.name,
      attributes: this.state.attributes,
    }
    return hog_rule
  }

  doSave(when_done=(()=>{})) {
    doTier1Save(
      'hog',
      this.state.name,
      this.getHogRuleFromState,
      this.props.displayInsightsMessage,
      this.props.tier_1_scanners,
      this.props.tier_1_scanner_current_ids,
      this.setLocalStateVarNoWarning,
      this.props.setGlobalStateVar,
      when_done,
    )
  }

  async doSaveToDatabase() {
    this.doSave(((hog_rule) => {
      this.props.saveScannerToDatabase(
        'hog',
        hog_rule,
        (()=>{this.props.displayInsightsMessage('Hog rule has been saved to database')})
      )
    }))
  }

  buildNameField() {
    return buildLabelAndTextInput(
      this.state.name,
      'Name',
      'hog_name',
      'name',
      25,
      ((value)=>{this.setLocalStateVar('name', value)})
    )
  }

  buildLoadButton() {
    return buildTier1LoadButton(
      'hog',
      this.props.tier_1_scanners['hog'],
      ((value)=>{this.loadHogMeta(value)})
    )
  }

  loadHogMeta(hog_id) {
    if (!hog_id) {
      this.loadNewHogMeta()
    } else {
      const hog = this.props.tier_1_scanners['hog'][hog_id]
      this.setState({
        id: hog['id'],
        name: hog['name'],
        attributes: hog['attributes'],
        unsaved_changes: false,
      })
    }
    let deepCopyIds = JSON.parse(JSON.stringify(this.props.tier_1_scanner_current_ids))
    deepCopyIds['hog'] = hog_id
    this.props.setGlobalStateVar('tier_1_scanner_current_ids', deepCopyIds)
    this.props.displayInsightsMessage('Hog meta has been loaded')
  }

  loadNewHogMeta() {
    let deepCopyIds = JSON.parse(JSON.stringify(this.props.tier_1_scanner_current_ids))
    deepCopyIds['hog'] = ''
    this.props.setGlobalStateVar('tier_1_scanner_current_ids', deepCopyIds)
    this.setState({
      id: '',
      name: '',
      attributes: {},
      unsaved_changes: false,
    })
  }

  buildDeleteButton() {
    return buildTier1DeleteButton(
      'hog',
      this.props.tier_1_scanners['hog'],
      ((value)=>{this.deleteHogMeta(value)})
    )
  }

  deleteHogMeta(ef_id) {
    let deepCopyScanners = JSON.parse(JSON.stringify(this.props.tier_1_scanners))
    let deepCopyHogs = deepCopyScanners['hog']
    delete deepCopyHogs[ef_id]
    deepCopyScanners['hog'] = deepCopyHogs
    this.props.setGlobalStateVar('tier_1_scanners', deepCopyScanners)
    if (ef_id === this.props.tier_1_scanner_current_ids['hog']) {
      let deepCopyIds = JSON.parse(JSON.stringify(this.props.tier_1_scanner_current_ids))
      deepCopyIds['hog'] = ''
      this.props.setGlobalStateVar('tier_1_scanner_current_ids', deepCopyIds)
    }
    this.props.displayInsightsMessage('Hog meta was deleted')
  }

  buildRunButton() {
    if (!this.state.id) {                                                       
      return ''                                                                 
    }
    return (
      <div className='d-inline'>
        <button
            className='btn btn-primary ml-2 dropdown-toggle'
            type='button'
            id='scanHogDropdownButton'
            data-toggle='dropdown'
            area-haspopup='true'
            area-expanded='false'
        >
          Run
        </button>
        <div className='dropdown-menu' aria-labelledby='scanHogDropdownButton'>
          <button className='dropdown-item'
              onClick={() => this.props.submitInsightsJob('hog_current_frame')}
          >
            Frame
          </button>
          <button className='dropdown-item'
              onClick={() => this.props.submitInsightsJob('hog_current_movie')}
          >
            Movie
          </button>
          <button className='dropdown-item'
              onClick={() => this.props.submitInsightsJob('hog_all_movies')}
          >
            All Movies
          </button>
        </div>
      </div>
    )
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
    const value_ele = document.getElementById('hog_attribute_value')
    const name_ele = document.getElementById('hog_attribute_name')
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
      'hog_attribute_name',
      'hog_attribute_value',
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

  render() {
    if (!this.props.visibilityFlags['hog']) {
      return([])
    }
    const header_row = makeHeaderRow(
      'hog',
      'hog_body',
      (() => this.props.toggleShowVisibility('hog'))
    )
    const id_string = buildIdString(this.state.id, 'hog', this.state.unsaved_changes)
    const save_button = this.buildSaveButton()
    const save_to_db_button = this.buildSaveToDatabaseButton()
    const name_field = this.buildNameField()
    const load_button = this.buildLoadButton()
    const delete_button = this.buildDeleteButton()
    const run_button = this.buildRunButton()
    const attributes_list = this.buildAttributesList()

    return (
        <div className='row bg-light rounded mt-3'>
          <div className='col'>

            {header_row}

            <div 
                id='hog_body' 
                className='row collapse pb-2'
            >
              <div id='hog_main' className='col'>

                <div className='row bg-light'>
                  {load_button}
                  {delete_button}
                  {save_button}
                  {save_to_db_button}
                  {run_button}
                </div>

                <div className='row bg-light'>
                  {id_string}
                </div>

                <div className='row bg-light'>
                  {name_field}
                </div>

                <div className='row bg-light'>
                  {attributes_list}
                </div>

                <div className='row bg-light border-top'>
                  <ScannerSearchControls
                    search_attribute_name_id='hog_database_search_attribute_name'
                    search_attribute_value_id='hog_database_search_attribute_value'
                    getScanners={this.props.getScanners}
                    importScanner={this.props.importScanner}
                    deleteScanner={this.props.deleteScanner}
                    scanners={this.props.scanners}
                    displayInsightsMessage={this.props.displayInsightsMessage}
                    search_type='hog'
                  />
                </div>

              </div>
            </div>

          </div>
        </div>
    )
  }
}

export default HogControls;
