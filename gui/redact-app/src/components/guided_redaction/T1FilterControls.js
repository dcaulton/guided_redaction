import React from 'react';
import ScannerSearchControls from './ScannerSearchControls'                     
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
  buildRunButton,
  buildAttributesAddRow,
  buildMatchIdField,
  setLocalT1ScannerStateVar,
  buildSkipCountDropdown,
} from './SharedControls'

class T1FilterControls extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      id: '',
      name: '',
      match_text: [],
      match_percent: 70,
      job_id: '',
      filter_criteria: {},
      scan_level: 'tier_1',
      attributes: {},
      attribute_search_value: '',
      attr_name: '',
      attr_operator: '',
      attr_value: '',
    }
    this.getMetaFromState=this.getMetaFromState.bind(this)
    this.setLocalStateVar=this.setLocalStateVar.bind(this)
    this.doSave=this.doSave.bind(this)
    this.setState=this.setState.bind(this)
  }

  buildMatchIdField3() {
    let matches = []
    matches.push({'': ''})
    for (let i=0; i < this.props.jobs.length; i++) {
      const job = this.props.jobs[i]
      const build_obj = {}
      const desc = job['description'] + ' ' + job['id'].slice(0,3) + '...'
      build_obj[job['id']] = desc
      matches.push(build_obj)
    }

    const drop = buildLabelAndDropdown(
      matches,
      'Job Id',
      this.state.job_id,
      'job_id',
      ((value)=>{this.setLocalStateVar('job_id', value)})
    )
    return drop
  }

  componentDidMount() {
    this.loadNewMeta()
  }

  setLocalStateVar(var_name, var_value, when_done=(()=>{})) {
    let var_value_in_state = ''
    if (Object.keys(this.state).includes(var_name)) {
      var_value_in_state = this.state[var_name]
    }
    setLocalT1ScannerStateVar(var_name, var_value, var_value_in_state, this.doSave, this.setState, when_done)
  }

  setAttribute(name, value) {
    let deepCopyAttributes = JSON.parse(JSON.stringify(this.state.attributes))
    deepCopyAttributes[name] = value
    this.setLocalStateVar(
      'attributes', 
      deepCopyAttributes, 
      (()=>this.props.displayInsightsMessage('Attribute was added'))
    )
  }

  doAddAttribute() {
    const value_ele = document.getElementById('t1_filter_attribute_value')
    const name_ele = document.getElementById('t1_filter_attribute_name')
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
    this.setLocalStateVar(
      'attributes', 
      deepCopyAttributes, 
      (()=>this.props.displayInsightsMessage('Attribute was deleted'))
    )
  }

  buildAttributesList() {
    const add_attr_row = buildAttributesAddRow(
      't1_filter_attribute_name',
      't1_filter_attribute_value',
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

  loadMeta(meta_id) {
    if (!meta_id) {
      this.loadNewMeta()
    } else {
      const meta = this.props.tier_1_scanners['t1_filter'][meta_id]
      this.setState({
        id: meta['id'],
        name: meta['name'],
        match_text: meta['match_text'],
        match_percent: meta['match_percent'],
        filter_criteria: meta['filter_criteria'],
        job_id: meta['job_id'],
        scan_level: meta['scan_level'],
        attributes: meta['attributes'],
      })
      meta_id = meta['id']
    }
    let deepCopyIds = JSON.parse(JSON.stringify(this.props.current_ids))
    deepCopyIds['t1_scanner']['t1_filter'] = meta_id
    this.props.setGlobalStateVar('current_ids', deepCopyIds)
    this.props.displayInsightsMessage('T1 Filter has been loaded')
  }

  loadNewMeta() {                                                   
    let deepCopyIds = JSON.parse(JSON.stringify(this.props.current_ids))
    deepCopyIds['t1_scanner']['t1_filter'] = ''
    this.props.setGlobalStateVar('current_ids', deepCopyIds)
    const the_id = 't1f_' + Math.floor(Math.random(1000000, 9999999)*1000000000).toString()

    this.setState({
      id: the_id,
      name: '',
      match_text: [],
      match_percent: 70,
      filter_criteria: {},
      job_id: '',
      scan_level: 'tier_1',
      attributes: {},
    })                                                                          
  } 

  getMetaFromState() {
    const meta = {
      id: this.state.id,
      name: this.state.name,
      match_text: this.state.match_text,
      match_percent: this.state.match_percent,
      filter_criteria: this.state.filter_criteria,
      job_id: this.state.job_id,
      scan_level: this.state.scan_level,
      attributes: this.state.attributes,
    }
    return meta
  }

  buildRunButtonWrapper() {
    if (!Object.keys(this.props.tier_1_scanners['t1_filter']).includes(this.state.id)) {
      return ''
    }
    return buildRunButton(
      this.props.tier_1_scanners, 't1_filter', this.props.buildTier1RunOptions, this.props.submitInsightsJob
    )
  }

  buildMatchText() {
    let the_value = ''
    if (this.state.match_text && this.state.match_text.length > 0) {
        the_value = this.state.match_text.join('\n')
    }
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
             value={the_value}
            onChange={(event) => this.setMatchText(event.target.value)}
          />
        </div>
      </div>
    )
  }

  setMatchText(the_value) {
    if (!the_value.trim()) {
      this.setLocalStateVar('match_text', [])
    } else {
      this.setLocalStateVar('match_text', the_value.split('\n'))
    }
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
            onChange={(event) => this.setLocalStateVar('match_percent', event.target.value)}
          />
        </div>
      </div>
    )
  }

  buildNameField() {
    return buildLabelAndTextInput(
      this.state.name,
      'Name',
      't1_filter_name',
      'name',
      25,
      ((value)=>{this.setLocalStateVar('name', value)})
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
      't1_filter',
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
        't1_filter',
        meta,
        (()=>{this.props.displayInsightsMessage('T1 Filter has been saved to database')})
      )
    }))
  }

  buildLoadButton() {
    return buildTier1LoadButton(
      't1_filter',
      this.props.tier_1_scanners['t1_filter'],
      ((value)=>{this.loadMeta(value)})
    )
  }

  buildDeleteButton() {
    return buildTier1DeleteButton(
      't1_filter',
      this.props.tier_1_scanners['t1_filter'],
      ((value)=>{this.deleteMeta(value)})
    )
  }

  deleteMeta(meta_id) {
    let deepCopyScanners = JSON.parse(JSON.stringify(this.props.tier_1_scanners))
    let deepCopyT1fs= deepCopyScanners['t1_filter']
    delete deepCopyT1fs[meta_id]
    deepCopyScanners['t1_filter'] = deepCopyT1fs
    this.props.setGlobalStateVar('tier_1_scanners', deepCopyScanners)
    if (meta_id === this.props.current_ids['t1_scanner']['t1_filter']) {
      let deepCopyIds = JSON.parse(JSON.stringify(this.props.current_ids))
      deepCopyIds['t1_scanner']['t1_filter'] = ''
      this.props.setGlobalStateVar('current_ids', deepCopyIds)
    }
    this.props.displayInsightsMessage('T1 Filter was deleted')
  }

  buildClearMatchesButton2() {                                                  
    return buildClearMatchesButton(                                             
      't1_filter',                                                          
      ((a)=>{this.clearT1FilterMatches(a)})                                 
    )                                                                           
  }                                                                             
      
  clearT1FilterMatches(scope) {
    return clearTier1Matches(
      't1_filter',
      this.props.tier_1_matches,
      this.props.current_ids['t1_scanner']['t1_filter'],
      this.props.movie_url,
      ((a,b)=>{this.props.setGlobalStateVar(a,b)}),
      ((a)=>{this.props.displayInsightsMessage(a)}),
      scope
    )
  }

  buildAttrNameField() {
    return buildLabelAndTextInput(
      this.state.attr_name,
      '',
      'set_tools_attr_name',
      'name',
      20,
      ((value)=>{this.setLocalStateVar('attr_name', value)})
    )
  }


  buildAttrValueField() {
    return buildLabelAndTextInput(
      this.state.attr_value,
      '',
      'set_tools_attr_value',
      'value',
      20,
      ((value)=>{this.setLocalStateVar('attr_value', value)})
    )
  }

  buildAddFilterCriterionButton() {
    return (
      <div>
        <button
            className='btn btn-primary'
            onClick={() => this.addFilterCriterion()}
        >
          Add
        </button>
      </div>
    )
  }

  buildDeleteFilterCriteriaButton(attr_name) {
    return (
      <div>
        <button
            className='btn btn-primary'
            onClick={() => this.deleteFilterCriterion(attr_name)}
        >
          Del
        </button>
      </div>
    )
  }

  deleteFilterCriterion(attr_name) {
    let deepCopyFcs = JSON.parse(JSON.stringify(this.state.filter_criteria))
    delete deepCopyFcs[attr_name]
    this.setLocalStateVar('filter_criteria', deepCopyFcs)
  }

  addFilterCriterion() {
    let deepCopyFcs = JSON.parse(JSON.stringify(this.state.filter_criteria))
    const build_obj = {
      operator: this.state.attr_operator,
      value: this.state.attr_value,
    }
    deepCopyFcs[this.state.attr_name] = build_obj
    const new_state_obj = {
      filter_criteria: deepCopyFcs,
      attr_name: '',
      attr_operator: '',
      attr_value: '',
    }
    this.setLocalStateVar(new_state_obj)
  }

  buildNewFilterCriteriaLine() {
    const attr_name_field = this.buildAttrNameField()
    const attr_oper_field = this.buildAttrOperatorField()
    const attr_value_field = this.buildAttrValueField()
    const add_button = this.buildAddFilterCriterionButton()
    return (
      <div className='border p-2 ml-2'>
        <div className='h5'>
          Add Filter Criteria
        </div>
        <table>
          <thead>
            <tr>
              <td>
                attr name
              </td>
              <td>
                operator
              </td>
              <td>
                value
              </td>
              <td>
              </td>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                {attr_name_field}
              </td>
              <td className='pt-2'>
                {attr_oper_field}
              </td>
              <td>
                {attr_value_field}
              </td>
              <td>
                {add_button}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    )
  }

  buildAttrOperatorField(){
    const operators = {
      'equals': 'equals',
      'in_list': 'is in list',
      'matches_regex_list': 'matches regexes',
    }
    return (
      <div>
          <select
              name='set_tools_attr_operator'
              value={this.state.attr_operator}
              onChange={(event) => this.setLocalStateVar('attr_operator', event.target.value)}
          >
            <option value=''></option>
            {Object.keys(operators).map((operation_id, index) => {
              return (
                <option value={operation_id} key={index}>{operators[operation_id]}</option>
              )
            })}
          </select>
      </div>
    )
  }

  buildFilterCriteriaLines() {
    return (
      <div className='border p-2 ml-2'>
        <div className='h5'>
          Existing Filter Criteria
        </div>

        <table>
          <thead>
            <tr>
              <td>
                attr name
              </td>
              <td>
                operator
              </td>
              <td>
                value
              </td>
              <td>
              </td>
            </tr>
          </thead>
          <tbody>
          {Object.keys(this.state.filter_criteria).map((attr_name, index) => {
            const attr_oper = this.state.filter_criteria[attr_name]['operator']
            const attr_value = this.state.filter_criteria[attr_name]['value']
            const delete_button = this.buildDeleteFilterCriteriaButton(attr_name)
            return (
              <tr>
                <td>
                  {attr_name}
                </td>
                <td className='pt-2'>
                  {attr_oper}
                </td>
                <td>
                  {attr_value}
                </td>
                <td>
                  {delete_button}
                </td>
              </tr>
            )
          })}
          </tbody>
        </table>

      </div>
    )
  }

  render() {
    if (!this.props.visibilityFlags['t1_filter']) {
      return([])
    }
    const id_string = buildIdString(this.state.id, 't1_filter_', false)
    const run_button = this.buildRunButtonWrapper()
    const load_button = this.buildLoadButton()
    const delete_button = this.buildDeleteButton()
    const save_to_database_button = this.buildSaveToDatabaseButton()
    const clear_matches_button = this.buildClearMatchesButton2()
    const match_text = this.buildMatchText()
    const source_job_id_field = this.buildMatchIdField3() 
    const match_percent = this.buildMatchPercent()
    const attributes_list = this.buildAttributesList()
    const header_row = makeHeaderRow(
      't1 filter',
      't1_filter_body',
      (() => this.props.toggleShowVisibility('t1_filter'))
    )
    const name_field = this.buildNameField()
    const new_filter_criteria = this.buildNewFilterCriteriaLine()
    const existing_filter_criteria = this.buildFilterCriteriaLines()

    return (
        <div className='row bg-light rounded mt-3'>
          <div className='col'>

            {header_row}

            <div 
                id='t1_filter_body' 
                className='row collapse pb-2'
            >
              <div id='t1_filter_main' className='col'>

                <div className='row bg-light'>
                  {load_button}
                  {delete_button}
                  {save_to_database_button}
                  {clear_matches_button}
                  {run_button}
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

                <div>
                  {source_job_id_field}
                </div>

                <div className='row bg-light'>
                  {match_percent}
                </div>

                <div className='row bg-light'>
                  {new_filter_criteria}
                </div>

                <div className='row bg-light'>
                  {existing_filter_criteria}
                </div>

                <div className='row mt-1 mr-1 ml-1 border-top'>                 
                  {attributes_list}                                             
                </div>      

                <div className='row mt-3 ml-1 mr-1'>
                  <ScannerSearchControls
                    search_attribute_name_id='t1_filter_database_search_attribute_name'
                    search_attribute_value_id='t1_filter_database_search_attribute_value'
                    getScanners={this.props.getScanners}
                    importScanner={this.props.importScanner}
                    deleteScanner={this.props.deleteScanner}
                    scanners={this.props.scanners}
                    displayInsightsMessage={this.props.displayInsightsMessage}
                    search_type='t1_filter'
                  />
                </div>

              </div>
            </div>

          </div>
        </div>
    )
  }
}

export default T1FilterControls;
