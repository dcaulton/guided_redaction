import React from 'react';

class OcrControls extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      match_text: [],
      match_percent: 90,
      scan_level: 'tier_1',
      start_coords: [],
      end_coords: [],
    }
    this.addOcrZoneCallback=this.addOcrZoneCallback.bind(this)
  }

  addOcrZoneCallback(end_coords) {
    const start_coords = this.props.clicked_coords
    this.setState({
      start_coords: start_coords,
      end_coords: end_coords,
    })
    this.props.handleSetMode('')
    this.props.displayInsightsMessage('zone was successfully selected')
  }

  buildPickCornersButton() {
    return (
      <button
          key='000'
          className='btn btn-primary'
          onClick={() => this.startOcrRegionAdd() }
      >
        Pick Corners
      </button>
    )
  }

  startOcrRegionAdd() {
    this.props.handleSetMode('scan_ocr_1')
    this.props.addInsightsCallback('scan_ocr_2', this.addOcrZoneCallback)
    this.props.displayInsightsMessage('Select the first corner of the area to scan')
  }

  packageAndCallSubmitJob(scope) {
    if (this.state.start_coords.length === 0) {
      this.props.displayInsightsMessage('Please pick start and end coords before running this job')
      return
    }
    const ocr_request_id = 'ocr_' + Math.floor(Math.random(1000000, 9999999)*1000000000).toString()
    const extra_data = {
      id: ocr_request_id,
      start_coords: this.state.start_coords,
      end_coords: this.state.end_coords,
      match_text: this.state.match_text,
      match_percent: this.state.match_percent,
      scan_level: this.state.scan_level,
    }
    this.props.submitInsightsJob(scope, extra_data)
  }

  buildRunButton() {
    let movie_set_keys = Object.keys(this.props.movie_sets)
    return (
      <div className='d-inline ml-2'>
        <button
            className='btn btn-primary dropdown-toggle'
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
              onClick={() => this.packageAndCallSubmitJob('ocr_current_movie')}
          >
            Movie
          </button>
          <button className='dropdown-item'
              onClick={() => this.packageAndCallSubmitJob('ocr_all_movies')}
          >
            All Movies
          </button>
            {movie_set_keys.map((value, index) => {
              return (
                <button
                    className='dropdown-item'
                    key={index}
                    onClick={() => this.packageAndCallSubmitJob('ocr_movie_set', value)}
                >
                  MovieSet '{this.props.movie_sets[value]['name']}' as Job
                </button>
              )
            })}
        </div>
      </div>
    )
  }

  updateMatchText(rows_as_string) {
    const match_text = rows_as_string.split('\n')
    this.setState({
      match_text: match_text,
    })
  }

  buildMatchText() {
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
             value={this.state.match_text.join('\n')}
             onChange={(event) => this.updateMatchText(event.target.value)}
          />
        </div>
      </div>
    )
  }

  updateMatchPercent(match_percent) {
    this.setState({
      match_percent: match_percent,
    })
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
            onChange={(event) => this.updateMatchPercent(event.target.value)}
          />
        </div>
      </div>
    )
  }

  updateScanLevel(scan_level) {
    this.setState({
      scan_level: scan_level,
    })
  }

  buildScanLevel() {
    const help_text = "Tier 1 means 'search for areas that match your critieria, then just return a yes if they exist', Tier 2 means 'search for matches, then turn all areas that match your criteria into areas to redact'"
    return (
      <div
        className='d-inline ml-2 mt-2'
        title={help_text}
      >   
        <div className='d-inline'>
          Scan Level:
        </div>
        <div className='d-inline ml-2'>
          <select
              name='ocr_scan_level'
              value={this.state.scan_level}
              onChange={(event) => this.setScanLevel(event.target.value)}
          >
            <option value='tier_1'>Tier 1</option>
            <option value='tier_2'>Tier 2</option>
          </select>
        </div>
      </div>
    )
  }

  buildStartEndCoords() {
    if (this.state.start_coords.length === 0 && this.state.end_coords.length === 0) {
      return ''
    }

    return (
      <div className='ml-2'>
        <div>
          <div className='d-inline'>
            start coords:
          </div>
          <div className='d-inline ml-2'>
            [{this.state.start_coords[0]}, {this.state.start_coords[1]}]
          </div>
        </div>
        <div>
          <div className='d-inline'>
            end coords:
          </div>
          <div className='d-inline ml-2'>
            [{this.state.end_coords[0]}, {this.state.end_coords[1]}]
          </div>
        </div>
      </div>
    )
  }

  render() {
    if (!this.props.visibilityFlags['ocr']) {
      return([])
    }
    const pick_button = this.buildPickCornersButton()
    const run_button = this.buildRunButton()
    const match_text = this.buildMatchText()
    const match_percent = this.buildMatchPercent()
    const scan_level = this.buildScanLevel()
    const start_end_coords = this.buildStartEndCoords()

    return (
        <div className='row bg-light rounded mt-3'>
          <div className='col'>
            <div className='row'>
              <div 
                className='col-lg-10 h3'
              > 
                ocr
              </div>
              <div className='col-lg-1 float-right'>
                <button
                    className='btn btn-link'
                    aria-expanded='false'
                    data-target='#ocr_body'
                    aria-controls='ocr_body'
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
                    onChange={() => this.props.toggleShowVisibility('ocr')}
                  />
                </div>
              </div>
            </div>

            <div 
                id='ocr_body' 
                className='row collapse pb-2'
            >
              <div id='ocr_main' className='col'>

                <div className='row mt-3 ml-2 bg-light'>
                  {pick_button}
                  {run_button}
                </div>

                <div className='row bg-light'>
                  {match_text}
                </div>

                <div className='row bg-light'>
                  {match_percent}
                </div>

                <div className='row bg-light'>
                  {scan_level}
                </div>

                <div className='row bg-light'>
                  {start_end_coords}
                </div>

              </div>
            </div>

          </div>
        </div>
    )
  }
}

export default OcrControls;
