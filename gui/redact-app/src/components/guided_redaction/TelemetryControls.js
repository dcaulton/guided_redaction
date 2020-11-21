import React from 'react';
import {
  makeHeaderRow,
} from './SharedControls'

class TelemetryControls extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      id: '',
      name: '',
      app_name: '',
      account: '',
      start_conditions: [],
      unsaved_changes: false,
      mappings_format: '1',
    }
  }

  componentDidMount() {
    if (this.props.current_ids['t1_scanner']['telemetry']) {
      let rule = this.props.tier_1_scanners['telemetry'][this.props.current_ids['t1_scanner']['telemetry']]
      this.setState({
        id: rule['id'],
        name: rule['name'],
        app_name: rule['app_name'],
        account: rule['account'],
        start_conditions: rule['start_conditions'],
      })
    }
  }

  setName(the_name) {
    this.setState({
      name: the_name,
      unsaved_changes: true,
    })
  }

  buildNameField()  {
    return (
      <div>
        <div className='d-inline ml-2'>
          Name:
        </div>
        <div
            className='d-inline ml-2'
        >
            <input
                id='telemetry_name'
                key='telemetry_name_1'
                title='name'
                size='25'
                value={this.state.name}
                onChange={(event) => this.setName(event.target.value)}
            />
        </div>
      </div>
    )
  }

  buildIdString()  {
    if (!this.props.current_ids['t1_scanner']['telemetry']) {
      return (
        <div className='d-inline ml-2 font-italic'>
          this rule has not been saved and has no id yet
        </div>
      )
    }
    let unsaved_changes_string = ''
    if (this.state.unsaved_changes) {
      unsaved_changes_string = ' (unsaved changes)'
    }
    return (
      <div>
        <div className='d-inline ml-2'>
          rule id {this.state.id}
        </div>
        <div className='d-inline ml-2 font-italic'>
          {unsaved_changes_string}
        </div>
      </div>
    )
  }

  setAppName(the_name) {
    this.setState({
      app_name: the_name,
      unsaved_changes: true,
    })
  }

  buildAppNameField()  {
    return (
      <div>
        <div className='d-inline ml-2'>
          App Name:
        </div>
        <div
            className='d-inline ml-2'
        >
            <input
                id='telemetry_app_name'
                key='telemetry_app_name_1'
                title='app_name'
                size='15'
                value={this.state.app_name}
                onChange={(event) => this.setAppName(event.target.value)}
            />
        </div>
      </div>
    )
  }

  setAccount(the_account) {
    this.setState({
      account: the_account,
      unsaved_changes: true,
    })
  }

  buildAccountField()  {
    return (
      <div>
        <div className='d-inline ml-2'>
          Account:
        </div>
        <div
            className='d-inline ml-2'
        >
            <input
                id='telemetry_account'
                key='telemetry_account_1'
                title='account'
                size='15'
                value={this.state.account}
                onChange={(event) => this.setAccount(event.target.value)}
            />
        </div>
      </div>
    )
  }

  updateStartConditions(conditions_as_string) {
    const conditions = conditions_as_string.split('\n')
    this.setState({
      start_conditions: conditions,
      unsaved_changes: true,
    })
  }

  buildStartConditions() {
    return (
      <div>
        <div
            className='d-inline'
        >
          regex to match against
        </div>
        <div
            className='d-inline'
        >
          <textarea
             id='start_conditions'
             cols='80'
             rows='2'
             value={this.state.start_conditions.join('\n')}
             onChange={(event) => this.updateStartConditions(event.target.value)}
          />
        </div>
      </div>
    )
  }

  updateMovieMappings(movie_mappings_as_string) {
    let movie_mappings = {}
    if (this.state.mappings_format === '1') {
      const movie_mappings_arr = movie_mappings_as_string.split('\n')
      for (let i=0; i < movie_mappings_arr.length; i++) {
        const mapping_row = movie_mappings_arr[i]
        const x = mapping_row.indexOf(':')
        if (x > -1) {
           const recording_id = mapping_row.substring(0, x).trim()
           const transaction_id = mapping_row.substring(x+1).trim()
           movie_mappings[recording_id] = transaction_id
        }
      }
    } else if (this.state.mappings_format === '2') {
      let s = movie_mappings_as_string
      var start_parens = []
      var i = -1
      while ((i=s.indexOf('(', i+1)) >= 0) start_parens.push(i)
      for (let i=0; i < start_parens.length; i++) {
        const sp_index = start_parens[i]
        const com_index = s.indexOf(',', sp_index)
        const w1q1_index = s.indexOf("'", sp_index)
        const w1q2_index = s.indexOf("'", w1q1_index+1)
        const w2q1_index = s.indexOf("'", com_index)
        const w2q2_index = s.indexOf("'", w2q1_index+1)
        const w1 = s.substring(w1q1_index+1, w1q2_index)
        const w2 = s.substring(w2q1_index+1, w2q2_index)
        movie_mappings[w1] = w2
      }
    }
    this.props.setTelemetryData(
      {movie_mappings: movie_mappings}, 
      (() => {this.props.displayInsightsMessage('Movie mappings have been loaded')}),
      (() => {this.props.displayInsightsMessage('nasty stuff happened')})
    )
  }

  setMappingsFormat(value) {
    this.setState({
      mappings_format: value,
    })
  }

  buildMappingsFormatDropdown() {
    const format_1_string = "transaction_id:recording_id  <newline>"
    const format_2_string = "[('transaction_id':'recording_id'), ...]"
    return (
      <div>
        <div className='d-inline ml-2'>
          Mappings Format
        </div>
        <div className='d-inline ml-2'>
          <select
              name='mappings_format'
              value={this.state.mappings_format}
              onChange={(event) => this.setMappingsFormat(event.target.value)}
          >
            <option value='1'>{format_1_string}</option>
            <option value='2'>{format_2_string}</option>
          </select>
        </div>
      </div>
    )
  }

  buildMovieMappings() {
    let movie_mappings = []
    const mappings_dropdown = this.buildMappingsFormatDropdown()
    for (let i=0; i < Object.keys(this.props.telemetry_data['movie_mappings']).length; i++) {
      const recording_id = Object.keys(this.props.telemetry_data['movie_mappings'])[i]
      const transaction_id = this.props.telemetry_data['movie_mappings'][recording_id]
      const build_string = recording_id + ' : ' + transaction_id
      movie_mappings.push(build_string)
    }
    const movie_mappings_as_string = movie_mappings.join('\n')
    let text_style = {
      'fontSize': '10px',
    }
    return (
      <div
          className='border-top mt-2'
      >
        <div
            className='font-weight-bold mt-2'
        >
          Movie Mappings
        </div>
        <div>
          (in format 'recording_id:transaction_id'):
          <span>(movies are named with their recording id)</span>
        </div>
        <div>
          {mappings_dropdown}
        </div>
        <div>
          <textarea
             id='telemetry_movie_mappings'
             cols='115'
             rows='8'
             style={text_style}
             value={movie_mappings_as_string}
             onChange={(event) => this.updateMovieMappings(event.target.value)}
          />
        </div>
      </div>
    )
  }

  loadNewTelemetryRule() {
    this.setState({
      id: '',
      name: '',
      app_name: '',
      account: '',
      start_conditions: [],
      unsaved_changes: false,
    })
    this.props.displayInsightsMessage('new rule loaded')
  }

  loadTelemetryRule(rule_id) {
    if (!rule_id) {
      this.loadNewTelemetryRule()
    } else {
      const rule = this.props.tier_1_scanners['telemetry'][rule_id]
      this.setState({
        id: rule['id'],
        name: rule['name'],
        app_name: rule['app_name'],
        account: rule['account'],
        start_conditions: rule['start_conditions'],
      })
      let deepCopyIds = JSON.parse(JSON.stringify(this.props.current_ids))
      deepCopyIds['t1_scanner']['telemetry'] = rule_id
      this.props.setGlobalStateVar('current_ids', deepCopyIds)
      this.props.displayInsightsMessage('telemetry rule loaded')
    }
  }

  buildLoadButton() {
    let return_array = []
    const telemetry_ids = Object.keys(this.props.tier_1_scanners['telemetry'])
    return_array.push(
      <div key='x35' className='d-inline'>
      <button
          key='telemetry_names_button'
          className='btn btn-primary ml-2 mt-2 dropdown-toggle'
          type='button'
          id='loadTelemetryDropdownButton'
          data-toggle='dropdown'
          area-haspopup='true'
          area-expanded='false'
      >
        Load
      </button>
      <div className='dropdown-menu' aria-labelledby='loadTelemetryDropdownButton'>
        {telemetry_ids.map((value, index) => {
          const telemetry_rule = this.props.tier_1_scanners['telemetry'][value]
          return (
            <button
                className='dropdown-item'
                key={index}
                onClick={() => this.loadTelemetryRule(telemetry_rule['id'])}
            >
              {telemetry_rule['name']}
            </button>
          )
        })}
        <button
            className='dropdown-item'
            key='000'
            onClick={() => this.loadNewTelemetryRule()}
        >
          new
        </button>
      </div>
      </div>
    )
    return return_array
  }

  importTelemetryRawData(files) {
    var app_this = this
    let reader = new FileReader()
    reader.onload = (function(event) {
      app_this.props.setTelemetryData(
        {
          raw_data_url: event.target.result,
          raw_data_filename: files[0].name,
        }, 
        (() => {app_this.props.displayInsightsMessage('Raw data has been loaded')}),
        (() => {app_this.props.displayInsightsMessage('nasty stuff happened')})
      )
    })
    reader.readAsDataURL(files[0]);
  }

  buildRawDataButton() {
    let raw_data_summary = ''
    if (this.props.telemetry_data['raw_data_url'])  {
      raw_data_summary = 'Raw data is currently located at '+this.props.telemetry_data['raw_data_url']
    }
    return (
      <div>
        <div className='d-inline mt-1'>
          Raw Data:
        </div>
        <div className='d-inline ml-2' >
          <input
              type="file"
              id="raw_data_file"
              name="raw_data_files[]"
              size='20'
              onChange={(event) => this.importTelemetryRawData(event.target.files)}
          />
        </div>
        <div className='font-italic'>
          {raw_data_summary}
        </div>
      </div>
    )
  }

  doSave() {
    if (!this.state.name) {
      this.props.displayInsightsMessage('Save aborted: Name is required for a telemetry rule')
      return
    }
    let rule_id = 'telemetry_rule_' + Math.floor(Math.random(1000000, 9999999)*1000000000).toString()
    if (this.state.id) {
      rule_id = this.state.id
    }
    const telemetry_rule = {
      id: rule_id,
      name: this.state.name,
      app_name: this.state.app_name,
      account: this.state.account,
      start_conditions: this.state.start_conditions,
    }
    let deepCopyScanners = JSON.parse(JSON.stringify(this.props.tier_1_scanners))
    let deepCopyTelemetryRules = deepCopyScanners['telemetry']
    deepCopyTelemetryRules[rule_id] = telemetry_rule
    deepCopyScanners['telemetry'] = deepCopyTelemetryRules
    this.props.setGlobalStateVar('tier_1_scanners', deepCopyScanners)
    this.props.displayInsightsMessage('Telemetry rule has been saved')
    let deepCopyIds = JSON.parse(JSON.stringify(this.props.current_ids))
    deepCopyIds['t1_scanner']['telemetry'] = rule_id
    this.props.setGlobalStateVar('current_ids', deepCopyIds)
    this.setState({
      id: rule_id,
      unsaved_changes: false,
    })
  }

  buildSaveButton() {
    return (
      <div
          className='d-inline'
      >
        <button
            className='btn btn-primary ml-2 mt-2'
            onClick={() => this.doSave()}
        >
          Save
        </button>
      </div>
    )
  }

  buildScanForTimestampButton() {
    return (
      <div className='d-inline'>
        <button
            className='btn btn-primary ml-2 mt-2 dropdown-toggle'
            type='button'
            id='runTelemetryDropdownButton'
            data-toggle='dropdown'
            area-haspopup='true'
            area-expanded='false'
        >
          Scan for Timestamp
        </button>
        <div className='dropdown-menu' aria-labelledby='RunTelemetryDropdownButton'>
          <button className='dropdown-item'
              onClick={() => this.props.submitInsightsJob('get_timestamp_current_movie')}
          >
            Movie
          </button>
          <button className='dropdown-item'
              onClick={() => this.props.submitInsightsJob('get_timestamp_all_movies')}
          >
            All Movies
          </button>
        </div>
      </div>
    )
  }

  buildRunButton() {
    return (
      <div className='d-inline'>
        <button
            className='btn btn-primary ml-2 mt-2 dropdown-toggle'
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
              onClick={() => this.props.submitInsightsJob('telemetry_current_movie')}
          >
            Movie
          </button>
          <button className='dropdown-item'
              onClick={() => this.props.submitInsightsJob('telemetry_all_movies')}
          >
            All Movies
          </button>
        </div>
      </div>
    )
  }

  render() {
    if (!this.props.visibilityFlags['telemetry']) {
      return([])
    }
    const id_string = this.buildIdString()
    const name_field = this.buildNameField() 
    const app_name_field = this.buildAppNameField() 
    const account_field = this.buildAccountField() 
    const load_button = this.buildLoadButton() 
    const start_conditions = this.buildStartConditions() 
    const raw_data_button = this.buildRawDataButton() 
    const movie_mappings = this.buildMovieMappings()
    const save_button = this.buildSaveButton() 
    const run_button = this.buildRunButton() 
    const scan_for_timestamp_button = this.buildScanForTimestampButton() 
    const header_row = makeHeaderRow(
      'telemetry',
      'telemetry_body',
      (() => this.props.toggleShowVisibility('telemetry'))
    )

    return (
        <div className='row bg-light rounded mt-3'>
          <div className='col'>

            {header_row}

            <div 
                id='telemetry_body' 
                className='row collapse'
            >
              <div id='telemetry_main' className='col ml-2'>
              
                <div 
                    className='row'
                >
                  {load_button}
                  {save_button}
                  {run_button}
                  {scan_for_timestamp_button}
                </div>
  
                <div 
                    className='row mt-1'
                >
                  {id_string}
                </div>
  
                <div 
                    className='row mt-1'
                >
                  {name_field}
                </div>
  
                <div 
                    className='row mt-1'
                >
                  {app_name_field}
                </div>
  
                <div 
                    className='row mt-1'
                >
                  {account_field}
                </div>
  
  
                <div 
                    className='row mt-1'
                >
                  {start_conditions}
                </div>

                <div className='row'>
                  {raw_data_button}
                </div>

                <div className='row mt-2'>
                  {movie_mappings}
                </div>
  
  
              </div>
            </div>

          </div>
        </div>
    )
  }
}

export default TelemetryControls;
