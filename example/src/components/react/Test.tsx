import './test.css'

const TestReact = ({
    title = "Hello World",
}) => {
return <div className="container-react">
        <h1>{ title }</h1>
        <h2>STORE STATIC: Test react</h2>
        <h2>STORE DYNAMIC: Test react</h2>
    </div>
}

export default TestReact