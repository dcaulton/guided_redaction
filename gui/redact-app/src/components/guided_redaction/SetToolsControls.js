import React from 'react';
import {
  buildLabelAndTextInput,
  setLocalT1ScannerStateVar,
  makeHeaderRow,
} from './SharedControls'

class SetToolsControls extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      operation: '',
      job_ids: [],
      mandatory_job_ids: [],
    }
    this.setState=this.setState.bind(this)
  }

  buildOperationField(){
    const operations = [
      'intersect',
      't1_sum',
      't1_diff',
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
    let var_value_in_state = ''
    if (Object.keys(this.state).includes(var_name)) {
      var_value_in_state = this.state[var_name]
    }
    let do_save_func = (() => {})
    setLocalT1ScannerStateVar(var_name, var_value, var_value_in_state, do_save_func, this.setState, when_done)
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
    let use_mandatory = false
    let title = 'Jobs'
    if ((this.state.operation !== 'intersect')  &&
       (this.state.operation !== 't1_sum')) {
      return ''
    }
    if (this.state.operation === 't1_sum') {
      title = 'Addends'
      use_mandatory = true
    }
    let mandatory_header_column = <td></td>
    if (use_mandatory) {
      mandatory_header_column = (
        <td>mandatory?</td>
      )
    }
    return (
      <div>
        <div className='h5'>
          {title}
        </div>
        <table className='table table-striped'>
          <thead>
            <tr className='font-weight-bold p-2'>
              <td>select</td>
              <td>job id</td>
              <td>operation</td>
              {mandatory_header_column}
            </tr>
          </thead>
          <tbody>
          {this.props.jobs.map((job, index) => {
            let job_checked = ''
            if (this.state.job_ids.includes(job.id)) {
              job_checked = 'checked'
            }
            let mandatory_column = <td></td>
            if (use_mandatory) {
              let mandatory_job_checked = ''
              if (this.state.mandatory_job_ids.includes(job.id)) {
                mandatory_job_checked = 'checked'
              }
              mandatory_column = (
                <td>
                  <input
                    className='ml-2 mr-2 mt-1'
                    checked={mandatory_job_checked}
                    type='checkbox'
                    onChange={() => this.toggleLocalChecked('mandatory_job_ids', job.id)}
                  />
                </td>
              )
            }

            return (
              <tr key={index}>

                <td>
                  <input
                    className='ml-2 mr-2 mt-1'
                    checked={job_checked}
                    type='checkbox'
                    onChange={() => this.toggleLocalChecked('job_ids', job.id)}
                  />
                </td>

                <td>
                  {job.id}
                </td>

                <td>
                  {job.operation}
                </td>

                {mandatory_column}

              </tr>
            )
          })}
          </tbody>
        </table>
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
    if (this.state.operation === 't1_sum') {
      pass_data['job_ids'] = this.state.job_ids
      pass_data['mandatory_job_ids'] = this.state.mandatory_job_ids
      this.props.submitInsightsJob('t1_sum', pass_data)
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
