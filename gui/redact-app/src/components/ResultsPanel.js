import React from 'react';

class ResultsPanel extends React.Component {
  constructor(props) {
    super(props)
    this.state = ({
      report_title: '',
    })
  }

  setReportTitle(the_title) {
    this.setState({
      report_title: the_title,
    })
  }

  render() {
    if (!this.props.showResults) {
      return([])
    }

    return (
        <div className='row bg-light rounded mt-3'>
          <div className='col'>
            <div className='row'>
              <div 
                className='col-lg-9 h3'
              > 
                results
              </div>
              <div className='col float-right'>
                <button
                    className='btn btn-link'
                    aria-expanded='false'
                    data-target='#results_body'
                    aria-controls='results_body'
                    data-toggle='collapse'
                    type='button'
                >
                  show/hide
                </button>
              </div>

              <div>
                <div>
                  <input
                    className='mr-2 mt-3'
                    type='checkbox'
                    onChange={() => this.props.toggleShowResults()}
                  />
                </div>
              </div>

            </div>

            <div 
                id='results_body' 
                className='row collapse'
            >
              <div id='results_main' className='col'>

                <div className='row mt-3 bg-light'>
                
                  <div
                      className='d-inline ml-2 mt-2'
                  >   
                      <input 
                          id='results_text'
                          size='30'
                          title='report title'
                          value={this.state.report_title}
                          onChange={(event) => this.setReportTitle(event.target.value)}
                      />


                  <select
                      name='movieset'
                      onChange={(event) => alert(event.target.value)}
                  >
                    <option value='0'>--MovieSet--</option>
                    <option value='823828432342'>custom 1</option>
                  </select>

                      <button
                          className='btn btn-primary m-2'
                          onClick={() => alert('stuff 2')}
                      >
                        Prepare 
                      </button>


                  </div>


                </div>

              </div>
            </div>

          </div>
        </div>
    )
  }
}

export default ResultsPanel;
