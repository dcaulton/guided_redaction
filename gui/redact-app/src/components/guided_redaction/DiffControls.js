import React from 'react';
import ScannerSearchControls from './ScannerSearchControls'
import {
  buildAttributesAddRow,
  buildLabelAndTextInput,
  buildInlinePrimaryButton, 
  buildTier1LoadButton, 
  buildTier1DeleteButton,
  makeHeaderRow,
  buildAttributesAsRows,
  buildIdString,
  clearTier1Matches,
  buildClearMatchesButton,
  buildRunButton,
  setLocalT1ScannerStateVar,
  doTier1Save,
  buildToggleField,
  loadMeta,
  loadNewMeta,
  deleteMeta,
} from './SharedControls'


class DiffControls extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      id: '',
      name: '',
      attributes: {},
      scan_level: 'tier_1',
      masks_always: false,
      attribute_search_name: '',
      attribute_search_value: '',
    }
    this.getMetaFromState=this.getMetaFromState.bind(this)
    this.setLocalStateVar=this.setLocalStateVar.bind(this)
    this.doSave=this.doSave.bind(this)
    this.setState=this.setState.bind(this)
    this.loadNewMetaWrapper=this.loadNewMetaWrapper.bind(this)
    this.scanner_type = 'diff'
    this.default_meta_values = {
      id: '',
      name: '',
      attributes: {},
      scan_level: 'tier_1',
      masks_always: false,
    }
  }

  loadNewMetaWrapper() {
    loadNewMeta(
      this.scanner_type, this.default_meta_values, this.props.current_ids, this.props.setGlobalStateVar, this.setState
    )
  }

  componentDidMount() {
    this.loadNewMetaWrapper()
  }

  setLocalStateVar(var_name, var_value, when_done=(()=>{})) {
    let var_value_in_state = ''
    if (Object.keys(this.state).includes(var_name)) {
      var_value_in_state = this.state[var_name]
    }
    setLocalT1ScannerStateVar(var_name, var_value, var_value_in_state, this.doSave, this.setState, when_done)
  }

  buildLoadButton(scanner_type) {
    return buildTier1LoadButton(
      scanner_type,
      this.props.tier_1_scanners[scanner_type],
      ((value)=>{loadMeta(
        value, scanner_type, this.default_meta_values, this.props.current_ids, this.props.setGlobalStateVar, 
        this.props.displayInsightsMessage, this.setState, this.state, this.props.tier_1_scanners, 
        this.loadNewMetaWrapper
      )})
    )
  }

  getMetaFromState() {
    const build_obj = JSON.parse(JSON.stringify(this.default_meta_values))
    for (let i=0; i < Object.keys(build_obj).length; i++) {
      const name = Object.keys(build_obj)[i]
      if (Object.keys(this.state).includes(name)) {
        build_obj[name] = this.state[name]
      }
    }
    return build_obj
  }

  doSave(when_done=(()=>{})) {
    doTier1Save(
      this.scanner_type,
      this.getMetaFromState,
      this.props.displayInsightsMessage,
      this.props.tier_1_scanners,
      this.props.current_ids,
      this.props.setGlobalStateVar,
      when_done
    )
  }

  async doSaveToDatabase() {
    this.doSave(((meta) => {
      this.props.saveScannerToDatabase(
        this.scanner_type,
        meta,
        (()=>{this.props.displayInsightsMessage(this.scanner_type + ' has been saved to database')})
      )
    }))
  }

  buildNameField() {
    return buildLabelAndTextInput(
      this.state.name,
      'Name',
      this.scanner_type + '_name',
      'name',
      25,
      ((value)=>{this.setLocalStateVar('name', value)})
    )
  }

  setAttribute(name, value) {
    let deepCopyAttributes = JSON.parse(JSON.stringify(this.state.attributes))
    deepCopyAttributes[name] = value
    this.setLocalStateVar('attributes', deepCopyAttributes)
    this.props.displayInsightsMessage('Attribute was added')
  }

  doAddAttribute() {
    const value_ele = document.getElementById(this.scanner_type + '_attribute_value')
    const name_ele = document.getElementById(this.scanner_type + '_attribute_name')
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
    this.setLocalStateVar('attributes', deepCopyAttributes)
    this.props.displayInsightsMessage('Attribute was deleted')
  }

  buildAttributesList() {
    const add_attr_row = buildAttributesAddRow(
      this.scanner_type + '_attribute_name',
      this.scanner_type + '_attribute_value',
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
    if (!Object.keys(this.props.tier_1_scanners[this.scanner_type]).includes(this.state.id)) {
      return ''
    }
    return buildRunButton(
      this.props.tier_1_scanners, 
      this.scanner_type, 
      this.props.buildTier1RunOptions, 
      this.props.submitInsightsJob,
      true
    )
  }

  buildDeleteButton() {
    return buildTier1DeleteButton(
      this.scanner_type,
      this.props.tier_1_scanners[this.scanner_type],
      ((value)=>{
        deleteMeta(
          value, this.props.tier_1_scanners, this.scanner_type, this.props.setGlobalStateVar, 
          this.props.current_ids, this.props.displayInsightsMessage
        ) 
      })
    )
  }

  clearMatches(scope) {
    return clearTier1Matches(
      this.scanner_type,
      this.props.tier_1_matches,
      this.props.current_ids['current_ids'][this.scanner_type],
      this.props.movie_url,
      ((a,b)=>{this.props.setGlobalStateVar(a,b)}),
      ((a)=>{this.props.displayInsightsMessage(a)}),
      scope
    )
  }

  buildClearMatchesButton2() {
    return buildClearMatchesButton(
      this.scanner_type,
      ((a)=>{this.clearMatches(a)})
    )
  }

  render() {
    if (!this.props.visibilityFlags[this.scanner_type]) {
      return([])
    }
    const load_button = this.buildLoadButton(this.scanner_type)
    const id_string = buildIdString(this.state.id, this.scanner_type, false)
    const name_field = this.buildNameField()
    const masks_field = buildToggleField('masks_always', 'Generate Masks Always', this.state.masks_always, this.setLocalStateVar)
    const attributes_list = this.buildAttributesList()
    const run_button = this.buildRunButtonWrapper()
    const delete_button = this.buildDeleteButton()
    const save_to_db_button = this.buildSaveToDatabaseButton()
    const clear_matches_button = this.buildClearMatchesButton2()
    const header_row = makeHeaderRow(
      this.scanner_type,
      this.scanner_type + '_body',
      (() => this.props.toggleShowVisibility(this.scanner_type))
    )

    return (
        <div className='row bg-light rounded mt-3'>
          <div className='col'>

            {header_row}

            <div 
                id='diff_body' 
                className='row collapse bg-light'
            >
              <div id='diff_main' className='col'>

                <div className='row'>
                  {load_button}
                  {delete_button}
                  {save_to_db_button}
                  {clear_matches_button}
                  {run_button}
                </div>

                <div className='row mt-2'>
                  {id_string}
                </div>

                <div className='row mt-2'>
                  {name_field}
                </div>

                <div className='row mt-2'>
                  {masks_field}
                </div>

                <div className='row mt-1 mr-1 ml-1 border-top'>
                  {attributes_list}
                </div>

                <div className='row mt-3 ml-1 mr-1'>
                  <ScannerSearchControls
                    search_attribute_name_id='diff_database_search_attribute_name'
                    search_attribute_value_id='diff_database_search_attribute_value'
                    getScanners={this.props.getScanners}
                    importScanner={this.props.importScanner}
                    deleteScanner={this.props.deleteScanner}
                    scanners={this.props.scanners}
                    displayInsightsMessage={this.props.displayInsightsMessage}
                    search_type='diff'
                  />
                </div>

              </div>
            </div>
          </div>
        </div>
    )
  }
}

export default DiffControls;
