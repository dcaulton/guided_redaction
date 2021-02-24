import React from 'react';
import ScannerSearchControls from './ScannerSearchControls'
import {
  buildRedactionTypeSelect,
  buildRedactionReplaceWithSelect,
  buildRedactionErodeIterationsSelect,
  buildRedactionBucketClosenessSelect,
  buildRedactionMinContourAreaSelect,
  buildRedactionPreserveHlinesSelect,
} from './redact_utils.js'
import {
  buildAttributesAddRow,
  buildLabelAndTextInput,
  buildInlinePrimaryButton,
  buildTier1LoadButton,
  buildTier1DeleteButton,
  makeHeaderRow,
  buildAttributesAsRows,
  buildIdString,
} from './SharedControls'

class RedactControls extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      id: '',
      name: '',
      mask_method: 'black_rectangle',
      replace_with: 'color_partitioned',
      erode_iterations: 9,
      bucket_closeness: 0,
      min_contour_area: 1000,
      preserve_hlines: 'yes',
      attributes: {},
      scan_level: 'tier_2',
      attribute_search_name: '',
      attribute_search_value: '',
    }
    this.getRedactRuleFromState=this.getRedactRuleFromState.bind(this)
    this.setLocalStateVar=this.setLocalStateVar.bind(this)
  }

  setAttribute(name, value) {
    let deepCopyAttributes = JSON.parse(JSON.stringify(this.state.attributes))
    deepCopyAttributes[name] = value
    this.setLocalStateVar('attributes', deepCopyAttributes)
    this.props.displayInsightsMessage('Attribute was added')
  }

  doAddAttribute() {
    const value_ele = document.getElementById('redact_rule_attribute_value')
    const name_ele = document.getElementById('redact_rule_attribute_name')
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
      'redact_rule_attribute_name',
      'redact_rule_attribute_value',
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

  doSave(when_done=(()=>{})) {
    let deepCopyRRs = JSON.parse(JSON.stringify(this.props.redact_rules))
    let deepCopyIDs = JSON.parse(JSON.stringify(this.props.current_ids))
    const rr = this.getRedactRuleFromState()
    const rr_id = rr['id']
    deepCopyRRs[rr_id] = rr
    deepCopyIDs['redact_rule'] = rr_id
    const build_dict = {
      redact_rules: deepCopyRRs,
      current_ids: deepCopyIDs,
    }
    this.props.setGlobalStateVar(build_dict)
    return rr
  }

  componentDidMount() {
    this.loadNewRedactRule()
  }

  loadRedactRule(rr_id) {
    if (!rr_id) {
      this.loadNewRedactRule()
    } else {
      const rr = this.props.redact_rules[rr_id]
      this.setState({
        id: rr['id'],
        name: rr['name'],
        attributes: rr['attributes'],
        scan_level: rr['scan_level'],
        mask_method: rr['mask_method'],
        replace_with: rr['replace_with'],
        erode_iterations: rr['erode_iterations'],
        bucket_closeness: rr['bucket_closeness'],
        min_contour_area: rr['min_contour_area'],
        preserve_hlines: rr['preserve_hlines'],
      })
    }
    this.props.setGlobalStateVar('redaction_rule_current_id', rr_id)
    this.props.displayInsightsMessage('Redaction Rule has been loaded')
  }

  loadNewRedactRule() {
    let deepCopyIDs = JSON.parse(JSON.stringify(this.props.current_ids))
    deepCopyIDs['redact_rule'] = ''
    this.props.setGlobalStateVar('current_ids', deepCopyIDs)
    const the_id = 'redact_rule_' + Math.floor(Math.random(1000000, 9999999)*1000000000).toString()

    this.setState({
      id: the_id,
      name: '',
      attributes: {},
      scan_level: 'tier_2',
      mask_method: 'black_rectangle',
      replace_with: 'color_partitioned',
      erode_iterations: 9,
      bucket_closeness: 0,
      min_contour_area: 1000,
      preserve_hlines: 'yes',
    })
  }

  getRedactRuleFromState() {
    const rule = {
      id: this.state.id,
      name: this.state.name,
      attributes: this.state.attributes,
      scan_level: this.state.scan_level,
      mask_method: this.state.mask_method,
      replace_with: this.state.replace_with,
      erode_iterations: this.state.erode_iterations,
      bucket_closeness: this.state.bucket_closeness,
      min_contour_area: this.state.min_contour_area,
      preserve_hlines: this.state.preserve_hlines,
    }
    return rule
  }

  setLocalStateVar(var_name, var_value, when_done=(()=>{})) {
    function anon_func() {
      this.doSave()
      when_done()
    }
    this.setState(
      {
        [var_name]: var_value,
      },
      anon_func
    )
  }

  buildRedactPipelineOptions() {
    if (!Object.keys(this.props.tier_1_matches).includes('pipeline')) {
      return ''
    }
    return (
      <div>
        {Object.keys(this.props.tier_1_matches['pipeline']).map((match_id, index1) => {
          let desc = 'unknown pipeline job ' + match_id
          let job = false
          for (let i=0; i < this.props.jobs.length; i++) {
            const test_job = this.props.jobs[i]
            if (test_job['id'] === match_id) {
              job = test_job
            }
          }
          if (job) {
            const short_id = job['id'].substring(0, 4) + '...'
            desc = 'Frames matched by pipeline job: ' + short_id + ' '+ job['description']
          }

          const build_obj = {
            source_type: 'pipeline',
            source_id: match_id,
            job_desc: desc,
          }
          return (
            <div key={index1}>
              <button className='dropdown-item'
                onClick={() => this.props.submitInsightsJob('redact_custom', build_obj)}
              >
                {desc}
              </button>
            </div>
          )
        })}
      </div>
    )
  }

  buildRedactT1Options() {
    return (
      <div>
        {Object.keys(this.props.tier_1_matches).map((scanner_type, index1) => {
          if (scanner_type === 'pipeline') {
            return ''
          }
          return (
            <div key={index1}>
              {Object.keys(this.props.tier_1_matches[scanner_type]).map((scanner_id, index2) => {
                let desc = 'Frames matched by ' + scanner_type + ' job'
                if (
                  Object.keys(this.props.tier_1_scanners).includes(scanner_type) &&
                  Object.keys(this.props.tier_1_scanners[scanner_type]).includes(scanner_id)
                ) {
                  const scanner = this.props.tier_1_scanners[scanner_type][scanner_id]
                  desc += ': ' + scanner['name']
                }
                const build_obj = {
                  source_type: 't1_scanner',
                  scanner_type: scanner_type,
                  source_id: scanner_id,
                  job_desc: desc,
                }
                return (
                  <div key={index2}>
                    <button className='dropdown-item'
                      onClick={() => this.props.submitInsightsJob('redact_custom', build_obj)}
                    >
                      {desc}
                    </button>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    )
  }

  buildRedactButton() {
    if (Object.keys(this.props.movies).length === 0) {
      return
    }
    const t1_options = this.buildRedactT1Options()
    const pipeline_options = this.buildRedactPipelineOptions()
    return (
      <div className='d-inline'>
        <button
            className='btn btn-primary ml-2 dropdown-toggle'
            type='button'
            id='redactDropdownButton'
            data-toggle='dropdown'
            area-haspopup='true'
            area-expanded='false'
        >
          Run
        </button>
        <div className='dropdown-menu' aria-labelledby='redactDropdownButton'>
          <button className='dropdown-item'
              onClick={() => this.props.submitInsightsJob('redact_current_movie')}
          >
            Movie
          </button>
          <button className='dropdown-item'
              onClick={() => this.props.submitInsightsJob('redact_all_movies')}
          >
            All Movies
          </button>

          {t1_options}
          {pipeline_options}
        </div>
      </div>
    )
  }

  async doSaveToDatabase() {
    const rr = this.doSave()
    this.props.saveScannerToDatabase(
      'redact_rule',
      rr,
      (()=>{this.props.displayInsightsMessage('Redact Rule has been saved to database')})
    )
  }

  buildSaveToDatabaseButton() {
    return buildInlinePrimaryButton(
      'Save to DB',
      (()=>{this.doSaveToDatabase()})
    )
  }

  buildNameField() {
    return buildLabelAndTextInput(
      this.state.name,
      'Name',
      'redact_rule_name',
      'name',
      25,
      ((value)=>{this.setLocalStateVar('name', value)})
    )
  }

  buildDeleteButton() {
    return buildTier1DeleteButton(
      'redact_rule',
      this.props.redact_rules,
      ((value)=>{this.deleteRedactRule(value)})
    )
  }

  deleteRedactRule(rr_id) {
    let deepCopyRRs = JSON.parse(JSON.stringify(this.props.redact_rules))
    delete deepCopyRRs[rr_id]
    let build_obj = {
      redact_rules: deepCopyRRs,
    }
    if (rr_id === this.props.current_ids['redact_rule']) {
      let deepCopyIDs = JSON.parse(JSON.stringify(this.props.current_ids))
      deepCopyIDs['redact_rule'] = ''
      build_obj['current_ids'] = deepCopyIDs
    }
    this.props.setGlobalStateVar(build_obj)
    this.props.displayInsightsMessage('Redact Rule was deleted')
  }

  buildLoadButton() {
    return buildTier1LoadButton(
      'redact_rule',
      this.props.redact_rules,
      ((value)=>{this.loadRedactRule(value)})
    )
  }

  render() {
    if (!this.props.visibilityFlags['redact']) {
      return([])
    }

    const header_row = makeHeaderRow(
      'redact',
      'redact_body',
      (() => this.props.toggleShowVisibility('redact'))
    )
    const redact_button = this.buildRedactButton()
    const delete_button = this.buildDeleteButton()
    const load_button = this.buildLoadButton()
    const save_to_db_button = this.buildSaveToDatabaseButton()
    const attributes_list = this.buildAttributesList()

    const mask_method_field = buildRedactionTypeSelect(
      'mask_method', 
      this.state.mask_method, 
      ((event)=>{this.setLocalStateVar('mask_method', event.target.value)})
    )
    const replace_with_field = buildRedactionReplaceWithSelect(
      'replace_with', 
      this.state,
      ((event)=>{this.setLocalStateVar('replace_with', event.target.value)})
    )
    const erode_iterations_field = buildRedactionErodeIterationsSelect(
      'erode_iterations', 
      this.state,
      ((event)=>{this.setLocalStateVar('erode_iterations', event.target.value)})
    )
    const bucket_closeness_field = buildRedactionBucketClosenessSelect(
      'bucket_closeness', 
      this.state,
      ((event)=>{this.setLocalStateVar('bucket_closeness', event.target.value)})
    )
    const min_contour_area_field = buildRedactionMinContourAreaSelect(
      'min_contour_area', 
      this.state,
      ((event)=>{this.setLocalStateVar('min_contour_area', event.target.value)})
    )
    const preserve_hlines_field = buildRedactionPreserveHlinesSelect(
      'preserve_hlines', 
      this.state,
      ((event)=>{this.setLocalStateVar('preserve_hlines', event.target.value)})
    )
    const id_string = buildIdString(this.state.id, 'redact_rule', false)
    const name_field = this.buildNameField()

    return (
        <div className='row bg-light rounded mt-3'>
          <div className='col'>

            {header_row}

            <div 
                id='redact_body' 
                className='row collapse'
            >
              <div id='redact_main' className='col'>

                <div id='row mt-2'>
                  {load_button}
                  {delete_button}
                  {save_to_db_button}
                  {redact_button}
                </div>

                <div id='row mt-2'>
                  {id_string}
                </div>

                <div id='row mt-2'>
                  {name_field}
                </div>

                <div id='row mt-2'>
                  {mask_method_field}
                  {replace_with_field}
                  {erode_iterations_field}
                  {bucket_closeness_field}
                  {min_contour_area_field}
                  {preserve_hlines_field}
                </div>

                <div id='row mt-2'>
                  {attributes_list}
                </div>

                <div className='row mt-3 ml-1 mr-1'>
                  <ScannerSearchControls
                    search_attribute_name_id='redact_rule_database_search_attribute_name'
                    search_attribute_value_id='redact_rule_database_search_attribute_value'
                    getScanners={this.props.getScanners}
                    importScanner={this.props.importRedactRule}
                    deleteScanner={this.props.deleteScanner}
                    scanners={this.props.scanners}
                    displayInsightsMessage={this.props.displayInsightsMessage}
                    search_type='redact_rule'
                  />
                </div>

              </div>
            </div>

          </div>
        </div>
    )
  }
}

export default RedactControls;
