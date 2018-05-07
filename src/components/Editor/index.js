import React, { PureComponent } from "react"
import ReactDOM from "react-dom"
import FontFaceObserver from "fontfaceobserver"

import "./style.sass"

// TODO: simplify this
import { monaco, language, provider, theme } from "../MonacoEditor"
monaco.languages.register(language)
monaco.languages.setMonarchTokensProvider("moniel", provider)
monaco.editor.defineTheme("moniel", theme)

export default class Editor extends PureComponent {
    container = null
    editor = null
    decorations = []
    viewZones = []
    _mount = async (el) => {
        this.container = el
        if (this.container) {
            const font = new FontFaceObserver("Fira Code")
            font.load().then(this.instantiateEditor, (e) => {
                console.error("Could not load the font")
            })
        }
    }
    instantiateEditor = () => {
        const config = {
            value: this.props.content,
            language: this.props.language,
            theme: "moniel",
            fontFamily: "Fira Code",
            fontSize: 16,
            fontLigatures: true,
            tabSize: ("tabSize" in this.props) ? this.props.tabSize : 4,
            readOnly: ("readOnly" in this.props) ? this.props.readOnly : false,
            glyphMargin: true,
            lineNumbers: false,
            wordWrap: "bounded",
            wrappingIndent: "indent",
            minimap: {
                enabled: false
            },
            scrollbar: {
                useShadows: false,
                verticalScrollbarSize: 5,
                horizontalScrollbarSize: 5
            }
        }
        this.editor = monaco.editor.create(this.container, config)
        window.addEventListener("resize", (e) => {
            this.editor.layout()
        })
        this.editor.onDidChangeModelContent((e) => {
            if (this.props.onChange) {
                const code = this.editor.getValue()
                this.props.onChange(code)
            }
        })
    }
    setDecorations(issues) {
        if (!issues) {
            return
        }

        // max one error, otherwise it is confusing
        issues = issues.filter((v, i) => i == 0)

        const markers = issues.map(issue => ({
            startLineNumber: issue.startLineNumber,
            startColumn: issue.startColumn,
            endLineNumber: issue.endLineNumber,
            endColumn: issue.endColumn,
            message: issue.message,
            severity: severityTable[issue.severity]
        }))

        const lineDecorations = issues.map(issue => ({
            range: new monaco.Range(issue.startLineNumber, issue.startColumn, issue.startLineNumber,issue. startColumn),
            options: {
                isWholeLine: true,
                className: `inlineDecoration ${issue.severity}`,
                glyphMarginClassName: `glyphDecoration ${issue.severity}`,
                glyphMarginHoverMessage: issue.message
            }
        }))

        this.editor.changeViewZones(changeAccessor => {
            this.viewZones.forEach(zone => {
                changeAccessor.removeZone(zone)
            })
            this.viewZones = issues.map(issue => {
                const domNode = document.createElement("div")
                this.renderIssue(issue, domNode)
                const viewZoneId = changeAccessor.addZone({
                    afterLineNumber: issue.startLineNumber,
                    afterColumn: 0,
                    heightInLines: 0,
                    domNode: domNode
                })
                return viewZoneId
            })
        })

        this.decorations = this.editor.deltaDecorations(this.decorations, lineDecorations);
        monaco.editor.setModelMarkers(this.editor.getModel(), "test", markers)
    }
    componentWillReceiveProps(props) {
        if (props.content !== this.props.content) {
            this.editor.setValue(props.content)
        }

        if (props.issues !== this.props.issues) {
            this.setDecorations(props.issues)
        }
    }
    renderIssue(issue, element) {
        ReactDOM.render(<Issue {...issue} />, element)
    }
    render() {
        return (
            <div style={{ flex: 1 }}>
                <div style={{ width: "100%", height: "100%" }} ref={this._mount} />
            </div>
        )
    }
}

const Issue = (props) => (
    <div className={`message ${props.severity}`}>{props.message}</div>
)

const severityTable = {
    "error": monaco.Severity.Error,
    "warning": monaco.Severity.Warning,
    "info": monaco.Severity.Info
}