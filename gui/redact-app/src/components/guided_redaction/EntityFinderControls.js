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

class EntityFinderControls extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      id: '',
      name: '',
      entity_type: '',
      attributes: {},
      unsaved_changes: false,
    }
    this.setLocalStateVar=this.setLocalStateVar.bind(this)
    this.getEntityFinderRuleFromState=this.getEntityFinderRuleFromState.bind(this)
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

  getEntityFinderRuleFromState() {
    const entity_finder_rule = {
      id: this.state.id,
      name: this.state.name,
      entity_type: this.state.entity_type,
      attributes: this.state.attributes,
    }
    return entity_finder_rule
  }

  doSave(when_done=(()=>{})) {
    doTier1Save(
      'entity_finder',
      this.getEntityFinderRuleFromState,
      this.props.displayInsightsMessage,
      this.props.tier_1_scanners,
      this.props.tier_1_scanner_current_ids,
      this.props.setGlobalStateVar,
      when_done,
    )
  }

  async doSaveToDatabase() {
    this.doSave(((entity_finder_rule) => {
      this.props.saveScannerToDatabase(
        'entity_finder',
        entity_finder_rule,
        (()=>{this.props.displayInsightsMessage('Entity finder rule has been saved to database')})
      )
    }))
  }

  buildNameField() {
    return buildLabelAndTextInput(
      this.state.name,
      'Name',
      'entity_finder_name',
      'name',
      25,
      ((value)=>{this.setLocalStateVar('name', value)})
    )
  }

  buildLoadButton() {
    return buildTier1LoadButton(
      'entity_finder',
      this.props.tier_1_scanners['entity_finder'],
      ((value)=>{this.loadEntityFinderMeta(value)})
    )
  }

  componentDidMount(){
    this.loadNewEntityFinderMeta()
  }

  loadEntityFinderMeta(entity_finder_id) {
    if (!entity_finder_id) {
      this.loadNewEntityFinderMeta()
    } else {
      const ef = this.props.tier_1_scanners['entity_finder'][entity_finder_id]
      this.setState({
        id: ef['id'],
        name: ef['name'],
        entity_type: ef['entity_type'],
        attributes: ef['attributes'],
        unsaved_changes: false,
      })
    }
    let deepCopyIds = JSON.parse(JSON.stringify(this.props.tier_1_scanner_current_ids))
    deepCopyIds['entity_finder'] = entity_finder_id
    this.props.setGlobalStateVar('tier_1_scanner_current_ids', deepCopyIds)
    this.props.displayInsightsMessage('Entity finder meta has been loaded')
  }

  loadNewEntityFinderMeta() {
    let deepCopyIds = JSON.parse(JSON.stringify(this.props.tier_1_scanner_current_ids))
    deepCopyIds['entity_finder'] = ''
    this.props.setGlobalStateVar('tier_1_scanner_current_ids', deepCopyIds)
    const the_id = 'entity_finder_' + Math.floor(Math.random(1000000, 9999999)*1000000000).toString()

    this.setState({
      id: the_id,
      name: '',
      entity_type: '',
      attributes: {},
      unsaved_changes: false,
    })
  }

  buildDeleteButton() {
    return buildTier1DeleteButton(
      'entity_finder',
      this.props.tier_1_scanners['entity_finder'],
      ((value)=>{this.deleteEntityFinderMeta(value)})
    )
  }

  deleteEntityFinderMeta(ef_id) {
    let deepCopyScanners = JSON.parse(JSON.stringify(this.props.tier_1_scanners))
    let deepCopyEntityFinders = deepCopyScanners['entity_finder']
    delete deepCopyEntityFinders[ef_id]
    deepCopyScanners['entity_finder'] = deepCopyEntityFinders
    this.props.setGlobalStateVar('tier_1_scanners', deepCopyScanners)
    if (ef_id === this.props.tier_1_scanner_current_ids['entity_finder']) {
      let deepCopyIds = JSON.parse(JSON.stringify(this.props.tier_1_scanner_current_ids))
      deepCopyIds['entity_finder'] = ''
      this.props.setGlobalStateVar('tier_1_scanner_current_ids', deepCopyIds)
    }
    this.props.displayInsightsMessage('Entity finder meta was deleted')
  }

  buildRunButton() {
    if (!Object.keys(this.props.tier_1_scanners['entity_finder']).includes(this.state.id)) {
      return ''                                                                 
    }
    return (
      <div className='d-inline'>
        <button
            className='btn btn-primary ml-2 dropdown-toggle'
            type='button'
            id='scanEntityFinderDropdownButton'
            data-toggle='dropdown'
            area-haspopup='true'
            area-expanded='false'
        >
          Run
        </button>
        <div className='dropdown-menu' aria-labelledby='scanEntityFinderDropdownButton'>
          <button className='dropdown-item'
              onClick={() => this.props.submitInsightsJob('entity_finder_current_frame')}
          >
            Frame
          </button>
          <button className='dropdown-item'
              onClick={() => this.props.submitInsightsJob('entity_finder_current_movie')}
          >
            Movie
          </button>
          <button className='dropdown-item'
              onClick={() => this.props.submitInsightsJob('entity_finder_all_movies')}
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
    const value_ele = document.getElementById('entity_finder_attribute_value')
    const name_ele = document.getElementById('entity_finder_attribute_name')
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
      'entity_finder_attribute_name',
      'entity_finder_attribute_value',
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

  buildEntityTypeDropdown() {
    const values = [                                                                                                    
      {'desktop': 'desktop'},
      {'taskbar': 'taskbar'},
      {'ie_window': 'internet explorer window'},
      {'chrome_window': 'chrome window'},
    ]
    return buildLabelAndDropdown(
      values,
      'Entity Type',
      this.state.entity_type,
      'entity_finder_entity_type',
      ((value)=>{this.setLocalStateVar('entity_type', value)})
    )
  }

  render() {
    if (!this.props.visibilityFlags['entity_finder']) {
      return([])
    }
    const header_row = makeHeaderRow(
      'entity finder',
      'entity_finder_body',
      (() => this.props.toggleShowVisibility('entity_finder'))
    )
    const id_string = buildIdString(this.state.id, 'entity finder', this.state.unsaved_changes)
    const save_button = this.buildSaveButton()
    const save_to_db_button = this.buildSaveToDatabaseButton()
    const name_field = this.buildNameField()
    const entity_type_field = this.buildEntityTypeDropdown()
    const load_button = this.buildLoadButton()
    const delete_button = this.buildDeleteButton()
    const run_button = this.buildRunButton()
    const attributes_list = this.buildAttributesList()

    return (
        <div className='row bg-light rounded mt-3'>
          <div className='col'>

            {header_row}

            <div 
                id='entity_finder_body' 
                className='row collapse pb-2'
            >
              <div id='entity_finder_main' className='col'>

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
                  {entity_type_field}
                </div>

                <div className='row bg-light'>
                  {attributes_list}
                </div>

                <div className='row bg-light'>
                  <ScannerSearchControls
                    search_attribute_name_id='entity_finder_database_search_attribute_name'
                    search_attribute_value_id='entity_finder_database_search_attribute_value'
                    getScanners={this.props.getScanners}
                    importScanner={this.props.importScanner}
                    deleteScanner={this.props.deleteScanner}
                    scanners={this.props.scanners}
                    displayInsightsMessage={this.props.displayInsightsMessage}
                    search_type='entity_finder'
                  />
                </div>

              </div>
            </div>

          </div>
        </div>
    )
  }
}

export default EntityFinderControls;
