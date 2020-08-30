import React from 'react';

class JobBug extends React.Component {

  render() {
    if (!this.props.attached_job || this.props.attached_job.status !== 'running') {
      return ''
    }
    const the_value = this.props.attached_job.percent_complete
    let float_val = parseFloat(the_value)
    let display_value = Math.floor(float_val * 100)
    let right_style = {}
    let left_style = {}
    if (float_val > .5) {
      right_style['transform'] = 'rotate(180deg)'
      const degs = Math.floor(360.0 * (float_val-.5)).toString()
      left_style['transform'] = 'rotate(' + degs + 'deg)'
    } else {
      const degs = Math.floor(360.0 * float_val).toString()
      right_style['transform'] = 'rotate(' + degs + 'deg)'
    }
    let job_str = ''
    for (let i=0; i < this.props.jobs.length; i++) {
      const job = this.props.jobs[i]
      if (job.id === this.props.attached_job.id) {
        if (job.app === 'pipeline' && job.operation === 'pipeline') {
          job_str += job.description
        } else {
          job_str += job.app + ':' + job.operation
        }
        break
      }
    }

    return (
      <div className='mt-3'>
        <div className="progress mx-auto" data-value='80'>
          <span 
            className="progress-left"
            data-toggle='tooltip'
            title={job_str}
          >
            <span 
              className="progress-bar border-primary"
              style={left_style}
            />
          </span>
          <span 
            className="progress-right"
            data-toggle='tooltip'
            title={job_str}
          >
            <span 
              className="progress-bar border-primary" 
              style={right_style}
            />
          </span>
          <div className="progress-value w-100 h-100 rounded-circle d-flex align-items-center justify-content-center">
            <div 
              className="font-weight-bold"
            >
              {display_value}
              <sup className="small">%</sup>

            </div>
          </div>
        </div>
      </div>
    )
  }
}


export default JobBug;
