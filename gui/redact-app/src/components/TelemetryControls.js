import React from 'react';

class TelemetryControls extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      id: '',
      name: '',
      app_name: '',
      start_conditions: [],
      end_conditions: [],
      actions: [],
      unsaved_changes: false,

    }
  }

  componentDidMount() {
    if (this.props.current_telemetry_rule_id) {
      let rule = this.props.telemetry_rules[this.props.current_telemetry_rule_id]
      this.setState({
        id: rule['id'],
        name: rule['name'],
        app_name: rule['app_name'],
        start_conditions: rule['start_conditions'],
        end_conditions: rule['end_conditions'],
        actions: rule['actions'],
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
                size='15'
                value={this.state.name}
                onChange={(event) => this.setName(event.target.value)}
            />
        </div>
      </div>
    )
  }

  buildIdString()  {
    if (!this.props.current_telemetry_rule_id) {
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
          start conditions:
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

  updateEndConditions(conditions_as_string) {
    const conditions = conditions_as_string.split('\n')
    this.setState({
      end_conditions: conditions,
      unsaved_changes: true,
    })
  }

  buildEndConditions() {
    return (
      <div>
        <div
            className='d-inline'
        >
          end conditions:
        </div>
        <div
            className='d-inline'
        >
          <textarea
             id='telemetry_start_conditions'
             cols='80'
             rows='2'
             value={this.state.end_conditions.join('\n')}
             onChange={(event) => this.updateEndConditions(event.target.value)}
          />
        </div>
      </div>
    )
  }

  updateActions(actions_as_string) {
    const actions = actions_as_string.split('\n')
    this.setState({
      actions: actions,
      unsaved_changes: true,
    })
  }

  buildActions() {
    return (
      <div>
        <div
            className='d-inline'
        >
          actions:
        </div>
        <div
            className='d-inline'
        >
          <textarea
             id='telemetry_actions'
             cols='80'
             rows='2'
             value={this.state.actions.join('\n')}
             onChange={(event) => this.updateActions(event.target.value)}
          />
        </div>
      </div>
    )
  }

  updateMovieMappings(movie_mappings_as_string) {
    let movie_mappings = {}
    const movie_mappings_arr = movie_mappings_as_string.split('\n')
    for (let i=0; i < movie_mappings_arr.length; i++) {
      const mapping_row = movie_mappings_arr[i]
      const x = mapping_row.indexOf(':')
      if (x > -1) {
         const movie_id = mapping_row.substring(0, x).trim()
         const recording_id = mapping_row.substring(x+1).trim()
         movie_mappings[movie_id] = recording_id
      }
    }
    this.props.setTelemetryData(
      {movie_mappings: movie_mappings}, 
      (() => {this.props.displayInsightsMessage('Movie mappings have been loaded')}),
      (() => {this.props.displayInsightsMessage('nasty stuff happened')})
    )
  }

  buildMovieMappings() {
    let movie_mappings = []
    for (let i=0; i < Object.keys(this.props.telemetry_data['movie_mappings']).length; i++) {
      const movie_id = Object.keys(this.props.telemetry_data['movie_mappings'])[i]
      const recording_id = this.props.telemetry_data['movie_mappings'][movie_id]
      const build_string = movie_id + ' : ' + recording_id
      movie_mappings.push(build_string)
    }
    const movie_mappings_as_string = movie_mappings.join('\n')
    let text_style = {
      'fontSize': '10px',
    }
    return (
      <div>
        <div
            className='d-inline'
        >
          movie mappings (in format 'movie_id:recording_id'):
        </div>
        <div
            className='d-inline'
        >
          <textarea
             id='telemetry_movie_mappings'
             cols='80'
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
      start_conditions: [],
      end_conditions: [],
      actions: [],
      unsaved_changes: false,
    })
    this.props.displayInsightsMessage('new rule loaded')
  }

  loadTelemetryRule(rule_id) {
    if (!rule_id) {
      this.loadNewTelemetryRule()
    } else {
      const rule = this.props.telemetry_rules[rule_id]
      this.setState({
        id: rule['id'],
        name: rule['name'],
        app_name: rule['app_name'],
        start_conditions: rule['start_conditions'],
        end_conditions: rule['end_conditions'],
        actions: rule['actions'],
      })
      this.props.setGlobalStateVar('current_telemetry_rule_id', rule_id)
      this.props.displayInsightsMessage('telemetry rule loaded')
    }
  }

  buildLoadButton() {
    let return_array = []
    const telemetry_ids = Object.keys(this.props.telemetry_rules)
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
          const telemetry_rule = this.props.telemetry_rules[value]
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
      start_conditions: this.state.start_conditions,
      end_conditions: this.state.end_conditions,
      actions: this.state.actions,
    }
    let deepCopyTelemetryRules = JSON.parse(JSON.stringify(this.props.telemetry_rules))
    deepCopyTelemetryRules[rule_id] = telemetry_rule
    this.props.setGlobalStateVar('telemetry_rules', deepCopyTelemetryRules)
    this.props.displayInsightsMessage('Telemetry rule has been saved')
    this.props.setGlobalStateVar('current_telemetry_rule_id', rule_id)
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
      <div
          className='d-inline'
      >
        <button
            className='btn btn-primary ml-2 mt-2'
            onClick={() => this.props.submitInsightsJob('get_timestamp_current_movie')}
        >
          Scan for Timestamp
        </button>
      </div>
    )
  }

  doScanForTimestamp() {
console.log('scanning for timestamp')
  }

  buildRunButton() {
    let movie_set_keys = Object.keys(this.props.movie_sets)
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
            {movie_set_keys.map((value, index) => {
              return (
                <button
                    className='dropdown-item'
                    key={index}
                    onClick={() => this.props.submitInsightsJob('telemetry_movie_set', value)}
                >
                  MovieSet '{this.props.movie_sets[value]['name']}' as Job
                </button>
              )
            })}
        </div>
      </div>
    )
  }

  buildTestButton() {
    return (
      <div
          className='d-inline'
      >
        <button
            className='btn btn-primary ml-2 mt-2'
            onClick={() => this.doTest()}
        >
          Test
        </button>
      </div>
    )
  }

  doTest() {
    this.props.displayInsightsMessage('WRITE CODE TO DO A TEST')
  }

  render() {
    if (!this.props.visibilityFlags['telemetry']) {
      return([])
    }
    const id_string = this.buildIdString()
    const name_field = this.buildNameField() 
    const app_name_field = this.buildAppNameField() 
    const load_button = this.buildLoadButton() 
    const start_conditions = this.buildStartConditions() 
    const end_conditions = this.buildEndConditions() 
    const actions = this.buildActions() 
    const raw_data_button = this.buildRawDataButton() 
    const movie_mappings = this.buildMovieMappings()
    const save_button = this.buildSaveButton() 
    const run_button = this.buildRunButton() 
    const test_button = this.buildTestButton() 
    const scan_for_timestamp_button = this.buildScanForTimestampButton() 

    return (
        <div className='row bg-light rounded mt-3'>
          <div className='col'>
            <div className='row'>
              <div 
                className='col-lg-10 h3'
              > 
                telemetry
              </div>
              <div className='col-lg-1 float-right'>
                <button
                    className='btn btn-link'
                    aria-expanded='false'
                    data-target='#telemetry_body'
                    aria-controls='telemetry_body'
                    data-toggle='collapse'
                    type='button'
                >
                  +/-
                </button>
              </div>
              <div className='col-lg-1'>
                <div>
                  <input
                    className='mr-2 mt-3'
                    type='checkbox'
                    onChange={() => this.props.toggleShowVisibility('telemetry')}
                  />
                </div>
              </div>
            </div>

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
                  {test_button}
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
                    className='row border-top mt-2 font-weight-bold'
                >
                  if (these conditions) 
                </div>
  
                <div 
                    className='row'
                >
                  {start_conditions}
                </div>
  
                <div 
                    className='row'
                >
                  {end_conditions}
                </div>
  
 

                <div 
                    className='row border-top mt-2 font-weight-bold'
                >
                  then (do this)
                </div>
  
                <div 
                    className='row'
                >
                  {actions}
                </div>

                <div 
                    className='row border-top mt-2 pt-1'
                >
                  <div className='col ml-5 mr-5'>
                    <div className='row border-bottom h5'
                    >
                      Telemetry Data
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

          </div>
        </div>
    )
  }
}

export default TelemetryControls;
