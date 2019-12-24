import React from 'react';
import TemplateControls from './TemplateControls'
import AnnotationControls from './AnnotationControls'
import SelectedAreaControls from './SelectedAreaControls'
import OcrControls from './OcrControls'
import SessionControls from './SessionControls'

class BottomInsightsControls extends React.Component {

  render() {
    let bottom_y = 100
    const ele = document.getElementById('insights_image_div')
    if (ele) {
      bottom_y += ele.offsetHeight
    }
    const controls_style = {
      top: bottom_y,
    }

    return (
      <div 
          id='bottom_insights_controls' 
          className='fixed-bottom'
          style={controls_style}
      >

        <TemplateControls 
          handleSetMode={this.props.handleSetMode}
          clearCurrentTemplateAnchor={this.props.clearCurrentTemplateAnchor}
          clearCurrentTemplateMaskZones={this.props.clearCurrentTemplateMaskZones}
          scanTemplate={this.props.scanTemplate}
          submitInsightsJob={this.props.submitInsightsJob}
          clearTemplateMatches={this.props.clearTemplateMatches}
          templates={this.props.templates}
          current_template_id={this.props.current_template_id}
          displayInsightsMessage={this.props.displayInsightsMessage}
          setCurrentTemplateId={this.props.setCurrentTemplateId}
          saveTemplate={this.props.saveTemplate}
          deleteTemplate={this.props.deleteTemplate}
        />

        <SelectedAreaControls
          handleSetMode={this.props.handleSetMode}
          getCurrentTemplateAnchorNames={this.props.getCurrentTemplateAnchorNames}
          clearMovieSelectedAreas={this.props.clearMovieSelectedAreas}
          setSelectedAreaTemplateAnchor={this.props.setSelectedAreaTemplateAnchor}
          getCurrentSelectedAreaMeta={this.props.getCurrentSelectedAreaMeta}
        />

        <AnnotationControls
          templates={this.props.templates}
          current_template_id={this.props.current_template_id}
          displayInsightsMessage={this.props.displayInsightsMessage}
          saveAnnotation={this.props.saveAnnotation}
          deleteAnnotation={this.props.deleteAnnotation}
          annotations={this.props.annotations}
          handleSetMode={this.props.handleSetMode}
          setKeyDownCallback={this.props.setKeyDownCallback}
          getAnnotations={this.props.getAnnotations}
        />

        <OcrControls
          displayInsightsMessage={this.props.displayInsightsMessage}
        />

        <SessionControls
          current_workbook_name={this.props.current_workbook_name}
          saveWorkbook={this.props.saveWorkbook}
          saveWorkbookName={this.props.saveWorkbookName}
          displayInsightsMessage={this.props.displayInsightsMessage}
          callPing={this.props.callPing}
          workbooks={this.props.workbooks}
          deleteWorkbook={this.props.deleteWorkbook}
          loadWorkbook={this.props.loadWorkbook}
        />

      </div>
    )
  }
}

export default BottomInsightsControls;
