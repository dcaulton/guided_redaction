import React from 'react';
import {
  makeHeaderRow,
} from './SharedControls'

class SetToolsControls extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      operation: '',
      job_ids: [],
    }
  }

  buildOperationField(){
    const operations = [
      'intersect',
    ]
    return (
      <div>
        <div className='d-inline'>
          Operation
        </div>
        <div className='d-inline ml-2'>
          <select
              name='set_tools_operation'
              value={this.state.operation}
              onChange={(event) => this.setLocalStateVar('operation', event.target.value)}
          >
            <option value=''></option>
            {operations.map((operation, index) => {
              return (
                <option value={operation} key={index}>{operation}</option>
              )
            })}
          </select>
        </div>
      </div>
    )
  }

  setLocalStateVar(var_name, var_value, when_done=(()=>{})) {
    function anon_func() {
      when_done()
    }
    this.setState(
      {
        [var_name]: var_value,
      },
      anon_func
    )
  }

  toggleLocalChecked(item_type, the_id) {
    let deepCopyIds = JSON.parse(JSON.stringify(this.state[item_type]))
    if (deepCopyIds.includes(the_id)) {
      const the_index = deepCopyIds.indexOf(the_id)
      deepCopyIds.splice(the_index, 1)
    } else {
      deepCopyIds.push(the_id)
    }
    this.setLocalStateVar(item_type, deepCopyIds)
  }

  buildJobsPicker() {
    if (this.state.operation !== 'intersect') {
      return ''
    }
    return (
      <div>
        <div className='h5'>
          Jobs
        </div>
        {this.props.jobs.map((job, index) => {
          const disp_name = job.id + ' - ' + job.operation
          let job_checked = ''
          if (this.state.job_ids.includes(job.id)) {
            job_checked = 'checked'
          }
          return (
            <div className='row' key={index}>

              <div className='d-inline'>
                <input
                  className='ml-2 mr-2 mt-1'
                  id={job.id}
                  checked={job_checked}
                  type='checkbox'
                  onChange={() => this.toggleLocalChecked('job_ids', job.id)}
                />
              </div>

              <div className='d-inline'>
              {disp_name}
              </div>

            </div>
          )
        })}
      </div>
    )
  }

  submitJob() {
    let pass_data = {
      operation: this.state.operation,
    }
    if (this.state.operation === 'intersect') {
      pass_data['job_ids'] = this.state.job_ids
      this.props.submitInsightsJob('intersect', pass_data)
    }
  }

  buildSubmitButton() {
    return (
      <div>
        <button
            className='btn btn-primary'
            onClick={() => this.submitJob()}
        >
          Submit Job
        </button>
      </div>
    )
  }

  render() {
    if (!this.props.visibilityFlags['set_tools']) {
      return([])
    }
    const header_row = makeHeaderRow(
      'set tools',
      'set_tools_body',
      (() => this.props.toggleShowVisibility('set_tools'))
    )
    const jobs_picker = this.buildJobsPicker()
    const operation_field = this.buildOperationField()
    const submit_button = this.buildSubmitButton()

    return (
        <div className='row bg-light rounded mt-3'>
          <div className='col'>

            {header_row}

            <div 
                id='set_tools_body' 
                className='row collapse'
            >
              <div id='set_tools_main' className='col'>

                <div className='row mt-2 ml-2'>
                  {operation_field}
                </div>

                <div className='row mt-2 ml-2'>
                  {jobs_picker}
                </div>

                <div className='row mt-2 ml-2'>
                  {submit_button}
                </div>

              </div>
            </div>

          </div>
        </div>
    )
  }
}

export default SetToolsControls;
