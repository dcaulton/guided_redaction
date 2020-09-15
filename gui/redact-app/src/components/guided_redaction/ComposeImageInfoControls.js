import React from 'react'
import {
  buildIllustrateColorSelect,
  buildIllustrateLineWidthSelect,
  buildIllustrateDarkenPercentSelect,
  buildRedactionRuleControls
} from './redact_utils.js'

class ComposeImageInfoControls extends React.Component {

  buildIllustrateColorDropdown() {
    if (!this.props.displayIllustrateControls) {
      return
    }
    const color_select = buildIllustrateColorSelect(
      'illustrate_color',
      this.props.illustrateParameters['color'],
      ((event) => this.props.setIllustrateParameters({color: event.target.value}))
    )
    return (
      <div className='mt-2'>
        <div className='d-inline font-weight-bold'>
          Set Illustrate Color:
        </div>
        <div className='d-inline ml-2'>
          {color_select}
        </div>
      </div>
    )
  }

  buildIllustrateLineWidthDropdown() {
    if (!this.props.displayIllustrateControls) {
      return
    }
    const line_width_select = buildIllustrateLineWidthSelect(
      'illustrate_line_width',
      this.props.illustrateParameters['lineWidth'],
      ((event) => this.props.setIllustrateParameters({lineWidth: event.target.value}))
    )
    return (
      <div className='mt-2'>
        <div className='d-inline font-weight-bold'>
          Set Illustrate Line Width:
        </div>
        <div className='d-inline ml-2'>
          {line_width_select}
        </div>
      </div>  
    )
  }

  buildIllustrateDarkenPercentDropdown() {
    if (!this.props.displayIllustrateControls) {
      return
    }
    const darken_percent_select = buildIllustrateDarkenPercentSelect(
      'illustrate_darken_percent',
      this.props.illustrateParameters['backgroundDarkenPercent'],
      (
        (event) => this.props.setIllustrateParameters(
          {backgroundDarkenPercent: event.target.value}
        )
      )
    )
    return (
      <div className='mt-2'>
        <div className='d-inline font-weight-bold'>
          Set Illustrate Background Darken Percent:
        </div>
        <div className='d-inline ml-2'>
          {darken_percent_select}
        </div>
      </div>
    )
  }

  buildDownloadLink() {
    let download_link = ''
    let download_filename = this.props.getImageUrl().split('/')
    download_link = (
      <div>
        <a
            href={this.props.getImageUrl()}
            download={download_filename}
        >
          download
        </a>
      </div>
    )
    return download_link
  }

  render() {
    if (!this.props.getImageUrl()) {
      return ''
    }
    const redact_rule_controls = buildRedactionRuleControls(
      this.props.redact_rule,
      this.props.setGlobalStateVar
    )
    const illustrate_color_dropdown = this.buildIllustrateColorDropdown()
    const illustrate_darken_dropdown = this.buildIllustrateDarkenPercentDropdown()
    const illustrate_line_width_dropdown = this.buildIllustrateLineWidthDropdown()
    const download_link = this.buildDownloadLink()

    return (
      <div className='col bg-light rounded border'>
        <div className='row'>
          <div
            className='col-lg-11 h3 float-left ml-2 mt-2'
          >
            Redaction / Illustration Options
          </div>
        </div>

        <div
            id='advanced_body'
            className='row border-top ml-2 mr-2'
        >

          <div id='advanced_main' className='col mb-3'>

            <div className='row mt-2'>
              <div className='d-inline font-weight-bold'>
                Download Image:
              </div>
              <div className='d-inline ml-2'>
                {download_link}
              </div>
            </div>

            {redact_rule_controls}

            <div className='row'>
              {illustrate_color_dropdown}
            </div>

            <div className='row'>
              {illustrate_line_width_dropdown}
            </div>

            <div className='row'>
              {illustrate_darken_dropdown}
            </div>
          </div>
        </div>

      </div>
    )
  }
}

export default ComposeImageInfoControls
